
const TransformersApi = Function('return import("@xenova/transformers")')();
const modelName = "xenova/clip-vit-base-patch32";

async function text2VecService(keyword) {
  const { AutoTokenizer, CLIPTextModelWithProjection, env } =
    await TransformersApi;
  env.allowLocalModels = false;
  let titleVector = [];
  const tokenizer = await AutoTokenizer.from_pretrained(modelName);
  const text_model = await CLIPTextModelWithProjection.from_pretrained(
    modelName
  );
  const texts = [keyword];
  const text_inputs = await tokenizer(texts, {
    padding: true,
    truncation: true,
  });
  const { text_embeds } = await text_model(text_inputs);
  titleVector = Object.values(text_embeds.data);
  return titleVector;
}
async function convertMultipleTitles2Vec(uploadTitleWs) {
  const resultObject = {};
  for (const key of Object.keys(uploadTitleWs)) {
    const title = uploadTitleWs[key];
    const vec = await text2VecService(title);
    console.log("key", key);
    resultObject[key] = vec;
  }

  return resultObject;
}
async function img2VecService(base64Image, url) {
  const { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } =
    await TransformersApi;
  env.allowLocalModels = false;
  let imageVector = [];
  let processor = await AutoProcessor.from_pretrained(modelName);
  const image_model = await CLIPVisionModelWithProjection.from_pretrained(
    modelName
  );
  let rawImage;
  if (base64Image) {
    let byteCharacters = atob(base64Image);
    let byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    let byteArray = new Uint8Array(byteNumbers);
    let blob = new Blob([byteArray], { type: "image/png" });

    rawImage = await RawImage.fromBlob(blob);
  } else if (url) {
    rawImage = await RawImage.read(url);
  }
  // Process image
  let image_inputs = await processor(rawImage);
  const { image_embeds } = await image_model(image_inputs);
  imageVector = Object.values(image_embeds.data);
  return imageVector;
}

async function convertMultipleUrls2Vec(uploadImageWs) {
  const resultObject = {};

  for (const key of Object.keys(uploadImageWs)) {
    const url = uploadImageWs[key];
    const vec = await img2VecService("", url);
    console.log("key", key);
    resultObject[key] = vec;
  }
  return resultObject;
}

module.exports = {
  text2VecService,
  convertMultipleTitles2Vec,
  img2VecService,
  convertMultipleUrls2Vec,
};
