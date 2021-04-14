const { Command } = require("commander");
const program = new Command();

program
  .option('-i, --input <path>', 'input video file')
  .option('-s, --start <value>', 'start time in video')
  .option('-d, --duration <value>', 'duration of video to use')
  .option('--speed <value>', 'video playback speed')
  .option('-f, --framerate <value>', 'frame rate to capture', "15")
  .option('-r, --resolution <value>', 'resolution of output', "48x48")
  .option('--shape <value>', 'type of shape to use (rectangle, box, sphere, circle)', "rectangle")
  .option('--scale <value>', 'scale of output shapes', "10")
  .option('--padding <value>', 'padding of output shapes', "0")
  .option('-t, --target <value>', 'output tool type (cm2, cm3)', "cm2")
  .option('-a, --audio', 'include audio')
  .option('-o, --output <file>', 'name of output file', "out.pz")
  .version('0.0.1', '-v, --version', 'output the current version');

program.parse(process.argv);

const options = program.opts();

const fs = require("fs");
const ffmpeg = require("ffmpeg");
const getPixels = require("get-pixels");

const cm2export = require("./cmexport.js").cm2export;
const cm3export = require("./cmexport.js").cm3export;

async function createShapes(imageFilenames)
{
  const shapes = [];

  //get the actual image size (sometimes different than the requested resolution)
  const imageSize = await new Promise((resolve, reject) =>
  {
    getPixels(`./tmp/frame_1.jpg`, (err, pixels) =>
    {
      resolve(pixels.shape.slice());
    });
  });

  const shapeCount = imageSize[0] * imageSize[1];
  const gridSize = parseFloat(options.scale) + parseFloat(options.padding);

  for (let i = 0; i < shapeCount; i++)
  {
    const x = ((i % imageSize[0]) - imageSize[0] * 0.5) * gridSize;
    const y = -(Math.floor(i / imageSize[0]) - imageSize[1] * 0.5) * gridSize;

    const shape =
    {
      position: [x, y],
      colorR: [],
      colorG: [],
      colorB: []
    };

    shapes.push(shape);
  }

  for (let i = 0; i < imageFilenames.length; i++)
  {
    await new Promise((resolve, reject) =>
    {
      getPixels(`./tmp/frame_${i + 1}.jpg`, (error, pixels) =>
      {
        if (error)
        {
          console.error(error);
          reject(error);
          return;
        }

        for (let j = 0; j < shapes.length; j++)
        {
          shapes[j].colorR.push(pixels.data[j * 4 + 0]);
          shapes[j].colorG.push(pixels.data[j * 4 + 1]);
          shapes[j].colorB.push(pixels.data[j * 4 + 2]);
        }

        resolve();
      });
    });
  }

  return shapes;
}

async function processVideo()
{
  if (fs.existsSync("./tmp"))
  {
    fs.rmdirSync("./tmp", { recursive: true });
  }

  fs.mkdirSync("./tmp");

  const process = new ffmpeg(options.input);
  const video = await process;

  const files = await new Promise((resolve, reject) =>
  {
    video.fnExtractFrameToJPG('./tmp',
    {
      frame_rate: parseFloat(options.framerate),
      start_time: options.start,
      duration_time: options.duration ? options.duration : undefined,
      size: options.resolution,
      keep_aspect_ratio: false,
      file_name : 'frame%f'
    },
    (error, files) =>
    {
      if (error)
      {
        console.error(error);
        reject(error);
        return;
      }

      resolve(files);
    });
  });

  let audioFile;
  if (options.audio)
  {
    audioFile = await new Promise((resolve, reject) =>
    {
      video.fnExtractSoundToMP3('./tmp/audio.mp3',
      (error, file) =>
      {
        if (error)
        {
          console.warn("couldn't extract audio");
          resolve();
          return;
        }

        resolve(file);
      });
    });
  }

  const shapes = await createShapes(files);

  if (options.target === "cm3")
  {
    await cm3export(
    {
      audio: !!audioFile,
      shapes: shapes,
      shapeType: options.shape,
      shapeSize: parseFloat(options.scale),
      output: options.output,
      period: Math.round(30 / parseFloat(options.framerate))
    });
  }
  else
  {
    await cm2export(
    {
      audio: !!audioFile,
      shapes: shapes,
      shapeType: options.shape,
      shapeSize: parseFloat(options.scale),
      output: options.output,
      period: Math.round(30 / parseFloat(options.framerate))
    });
  }

  fs.rmdirSync("./tmp", { recursive: true });
}

console.log("converting...");
processVideo();