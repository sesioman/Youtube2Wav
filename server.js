const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs');
const axios = require('axios'); 
const {PythonShell} = require('python-shell')
const socketIo = require('socket.io')
const io = socketIo(server)

const PORT = 80

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }));

server.listen(PORT)

console.log(`Server listening port ${PORT}`)

let linksList = [];

let id = 0;

const apiKey = 'AIzaSyCYV9tKxpcgKRhW4Es5RvHylOg2UmUOlOI'; // Reemplaza 'TU_CLAVE_DE_API' con tu clave de API de YouTube.


app.get('/', (req, res) => {
  res.render('index', {links: linksList});
});

// Manejar la conexión de socket
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Manejar el cambio de estado
  socket.on('changeState', (newState) => {
    io.emit('updateButtonsState', newState);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

app.get('/dist/output.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(__dirname + '/dist/output.css');
});

app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(__dirname + '/script.js');
});



app.post('/add-link', (req, res) => {
  const link = req.body.link
  const videoId = getYouTubeVideoId(link);
  console.log(videoId)
  if (videoId) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;
    let videoTitle
    let thumbnailUrl
    
    axios.get(apiUrl)
    .then(response => {
      videoTitle = limpiarNombreArchivo(response.data.items[0].snippet.title);
      thumbnailUrl = response.data.items[0].snippet.thumbnails.default.url;
      linksList.unshift({
        url: link,
        title: videoTitle,
        thumbnailUrl: thumbnailUrl,
        id: ++id,
        onServer: false
      });
      let options = {
        mode: 'text',
        pythonPath: '/usr/bin/python3',
        scriptPath: __dirname,
        args: [link,videoTitle]
      };
    
      PythonShell.run('youtubetowav.py', options, function (err, result) {

      }).then(
        waitForFileCreation(path.join(__dirname,'wavs',`${videoTitle}.wav`), 500).then(() => {
          io.emit('updateButtonsState',{id: id, display: 'flex'})
          linkEncontrado = linksList.find(link => link.id == id)
          linkEncontrado.onServer = true;
        }).catch(error => {
          console.error('Error en los procesos Python:', error.message)
        })
      )

      res.redirect('/')
      
    })
    .catch(error => {
      console.error('Error al obtener el título del video:', error.message);
      res.redirect('/')
    });
    } else res.redirect('/')
  });

  app.get('/download', (req, res) => {
    const urlId = req.query.id;
    let foundLink = null;
  
    // Buscar el enlace correspondiente en la lista de enlaces
    for (const link of linksList) {
      if (link.id == urlId && !fs.existsSync(path.join(__dirname, 'wavs', `${link.title}.webm`))) {
        foundLink = link;
        break; // Detener el bucle una vez que se encuentra el enlace
      }
    }
  
    if (foundLink) {
      const AUDIO_FILE_PATH = path.join(__dirname, 'wavs', `${foundLink.title}.wav`);
      const filename = path.basename(AUDIO_FILE_PATH);
  
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'audio/wav');
  
      res.sendFile(AUDIO_FILE_PATH);
    } else {
      // Si no se encuentra el enlace o el archivo .webm existe, redirigir
      res.redirect('/');
    }
  });
  

  app.post('/delete', (req, res) => {
    const urlId = req.body.id
    let audioTitle = linksList.find(link => link.id.toString() == urlId)
    if (audioTitle) {
      audioTitle = audioTitle.title
      fs.promises.unlink(`./wavs/${audioTitle}.wav`).then(() => {
      linksList = linksList.filter(link => link.id != urlId)
      res.redirect('/')
    }).catch(linksList = linksList.filter(link => link.id != urlId))
  }
  else res.redirect('/')
})



function limpiarNombreArchivo(cadena) {
  // Expresión regular para buscar caracteres no permitidos en nombres de archivo
  const caracteresNoPermitidos = /[<>:"\/\\|?*\x00-\x1F]/g;

  // Reemplazar los caracteres no permitidos con una cadena vacía
  const nombreLimpio = cadena.replace(caracteresNoPermitidos, '');

  return nombreLimpio;
}


function getYouTubeVideoId(url) {
  const regex = /(?:[?&]v=|\/embed\/|\/\d+\/|\/vi?\/|https?:\/\/(?:www\.)?youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}



// Función para esperar la creación de un archivo con un nombre específico
const waitForFileCreation = (filePath, interval) => {
  return new Promise((resolve) => {
    const checkFile = () => {
      if (fs.existsSync(filePath) && !fs.existsSync(filePath.slice(0, -4) + '.webm')) {
        console.log(`El archivo ${filePath} ha sido creado.`);
        resolve();
      } else {
        setTimeout(checkFile, interval);
      }
    };

    checkFile();
  });
};

// Uso de la función para esperar la creación del archivo
// Intervalo de verificación en milisegundos


const intervaloDeCorrecion = setInterval((callback) => {
  fs.readdir(path.join(__dirname, "wavs"), (error, archivos) => {
    if (error) {
      console.error('Error al leer el directorio:', error);
      return;
    }
    archivos.forEach(archivo => {
      link = linksList.find(link => link.title == archivo.slice(0, -4))
      if (link) {
        io.emit('updateButtonsState',{id: link.id, display: 'flex'})
        link.onServer = true
      } 
    });
  });
},60000)



