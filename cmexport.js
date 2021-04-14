const fs = require("fs");
const tar = require("tar-stream");

const zlib = require('minizlib');

const cm2GroupTemplate =
`{"normalProps":{"name":"Video","reflectionVisibility":0},"keyframeProps":{"enabled":[{"frame":1,"value":1,"tweenfn":0}],"position":[{"frame":1,"value":{"x":0,"y":0,"z":0},"tweenfn":257}],"rotation":[{"frame":1,"value":{"x":0,"y":0,"z":0},"tweenfn":257}],"scale":[{"frame":1,"value":{"x":1,"y":1,"z":1},"tweenfn":257}]},"objects":[]}`;

const cm2ShapeTemplate =
`{"objectType":3,"normalProps":{"size":{"x":10,"y":10,"z":10},"detail":{"x":1,"y":1},"thetaRange":{"x":0,"y":6.283185307179586},"phiRange":{"x":0,"y":3.141592653589793},"arc":6.283185307179586,"thickness":2,"loops":5,"openEnded":false},"appearanceObj":"singlecolor","keyframeProps":{"position":[{"frame":1,"value":{"x":0,"y":0,"z":0},"tweenfn":257}],"rotation":[{"frame":1,"value":{"x":0,"y":0,"z":0},"tweenfn":257}],"scale":[{"frame":1,"value":{"x":1,"y":1,"z":1},"tweenfn":257}]}}`;

const cm2AppearanceTemplate =
`{"keyframeProps":{"color":[]}}`;

async function cm2export({ audio, shapes, shapeType, shapeSize, output, period })
{
  if (fs.existsSync("./pz"))
  {
    fs.rmdirSync("./pz", { recursive: true });
  }

  fs.mkdirSync("./pz");

  const newFiles = [];

  const group = JSON.parse(cm2GroupTemplate);

  for (let i = 0; i < shapes.length; i++)
  {
    const shape = JSON.parse(cm2ShapeTemplate);
    const appearance = JSON.parse(cm2AppearanceTemplate);

    shape.normalProps.size.x = shape.normalProps.size.y = shape.normalProps.size.z = shapeSize;
    shape.keyframeProps.position[0].value.x = shapes[i].position[0];
    shape.keyframeProps.position[0].value.y = shapes[i].position[1];

    for (let j = 0; j < shapes[i].colorR.length; j++)
    {
      const color = (shapes[i].colorR[j] << 16) | (shapes[i].colorG[j] << 8) | shapes[i].colorB[j];
      appearance.keyframeProps.color.push(
      {
        frame: j * period,
        value: color,
        tweenFn: 0
      });
    }

    fs.writeFileSync(`./pz/object0_${i}`, JSON.stringify(shape));
    newFiles.push(`pz/object0_${i}`);
    fs.writeFileSync(`pz/object0_${i}_appearance`, JSON.stringify(appearance));
    newFiles.push(`pz/object0_${i}_appearance`);

    group.objects.push(0);
  }

  fs.writeFileSync(`./pz/object0`, JSON.stringify(group));
  newFiles.push(`pz/object0`);

  if (audio)
  {
    fs.renameSync("./tmp/audio.mp3", "./pz/audio_file");
    newFiles.push("pz/audio_file");
  }

  await createProjectFile("./cm2template.pz", newFiles, `./${output}`);

  fs.rmdirSync("./pz", { recursive: true });
}

const cm3ShapeTemplate =
`{"type":0,"objectType":3,"properties":{"name":"Shape","geometryProperties":{"rect_size":[10,10]},"position":{"objects":[{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]}]},"rotation":{"objects":[{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]}]},"scale":{"objects":[{"animated":false,"keyframes":[{"value":1,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":1,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]},{"animated":false,"keyframes":[{"value":1,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}]}]},"eulerOrder":"XYZ"},"material":{"type":"singlecolor","properties":{"name":"Single Color","color":{"objects":[{"animated":false,"keyframes":[]},{"animated":false,"keyframes":[]},{"animated":false,"keyframes":[]}]}}}}`;

const cm3ColorKeyframeTemplate =
`{"value":0,"frame":0,"tween":1,"controlPoints":[[-10,0],[10,0]]}`;

async function cm3export({ audio, shapes, shapeType, shapeSize, output, period })
{
  const newFiles = [];

  const project = JSON.parse(fs.readFileSync("./cm3template.json"));

  for (let i = 0; i < shapes.length; i++)
  {
    const shape = JSON.parse(cm3ShapeTemplate);

    shape.properties.geometryProperties.rect_size[0] = 
    shape.properties.geometryProperties.rect_size[1] = shapeSize;

    shape.properties.position.objects[0].keyframes[0].value = shapes[i].position[0];
    shape.properties.position.objects[1].keyframes[0].value = shapes[i].position[1];

    for (let j = 0; j < shapes[i].colorR.length; j++)
    {
      const kfR = JSON.parse(cm3ColorKeyframeTemplate);
      const kfG = JSON.parse(cm3ColorKeyframeTemplate);
      const kfB = JSON.parse(cm3ColorKeyframeTemplate);

      kfR.value = parseFloat((shapes[i].colorR[j] / 255).toPrecision(3));
      kfR.frame = j * period;
      kfR.tween = 0;
      kfB.value = parseFloat((shapes[i].colorB[j] / 255).toPrecision(3));
      kfB.frame = j * period;
      kfB.tween = 0;
      kfG.value = parseFloat((shapes[i].colorG[j] / 255).toPrecision(3));
      kfG.frame = j * period;
      kfG.tween = 0;

      shape.material.properties.color.objects[0].keyframes.push(kfR);
      shape.material.properties.color.objects[1].keyframes.push(kfG);
      shape.material.properties.color.objects[2].keyframes.push(kfB);
    }

    project.sequence.videoTracks[0].clips[0].object.objects.push(shape);
  }

  fs.writeFileSync(`./project`, JSON.stringify(project));
  newFiles.push(`project`);

  // if (audio)
  // {
  //   fs.renameSync("./tmp/audio.mp3", "./pz/audio_file");
  //   newFiles.push("pz/audio_file");
  // }

  await createProjectFile("./cm3template.pz", newFiles, `./${output}`);

  fs.rmSync("./project");
}

async function createProjectFile(input, newFiles, output)
{
  await new Promise((resolve, reject) =>
  {
    const extract = tar.extract();
    const pack = tar.pack();

    const inputStream = fs.createReadStream(input);
    const outputStream = fs.createWriteStream(output);

    extract.on("entry", (header, stream, callback) =>
    {
      stream.pipe(pack.entry(header, callback));
    })

    extract.on("finish", async () =>
    {
      for (let i = 0; i < newFiles.length; i++)
      {
        const stream = fs.createReadStream(newFiles[i]);
        const stat = fs.statSync(newFiles[i]);
        await new Promise((resolve, reject) =>
        {
          stream.pipe(pack.entry({ name: newFiles[i], size: stat.size }, resolve));
        });
      }

      pack.finalize();

      resolve();
    });
    
    const inflate = new zlib.Gunzip();
    const deflate = new zlib.Gzip();

    inputStream.pipe(inflate).pipe(extract);
    pack.pipe(deflate).pipe(outputStream);
  });
}

module.exports = { cm2export: cm2export, cm3export: cm3export };