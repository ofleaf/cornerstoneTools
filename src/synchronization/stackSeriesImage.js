import external from '../externalModules.js';
import { getToolState } from '../stateManagement/toolState.js';
import loadHandlerManager from '../stateManagement/loadHandlerManager.js';
import clip from '../util/clip.js';
// import convertToVector3 from '../util/convertToVector3.js';

export default function (synchronizer, sourceElement, targetElement, sourceElementIndex, targetElementIndex) {

  if (targetElement === sourceElement) {
    return;
  }

  const cornerstone = external.cornerstone;
  const sourceStackToolDataSource = getToolState(sourceElement, 'stack');
  const sourceStackData = sourceStackToolDataSource.data[0];
  const targetStackToolDataSource = getToolState(targetElement, 'stack');
  const targetStackData = targetStackToolDataSource.data[0];

  let newImageIdIndex = sourceStackData.currentImageIdIndex;

  newImageIdIndex = clip(newImageIdIndex, 0, targetStackData.imageIds.length - 1);

  let distance = targetElementIndex - sourceElementIndex;

  const startLoadingHandler = loadHandlerManager.getStartLoadHandler();
  const endLoadingHandler = loadHandlerManager.getEndLoadHandler();
  const errorLoadingHandler = loadHandlerManager.getErrorLoadingHandler();

  if (startLoadingHandler) {
    startLoadingHandler(targetElement);
  }

  let targetIndex = newImageIdIndex + distance;

  if (targetIndex > targetStackData.imageIds.length - 1) {
    targetIndex = targetStackData.imageIds.length - 1;
  } else if (targetIndex < 0) {
    targetIndex = 0;
  }

  let loader;

  if (targetStackData.preventCache === true) {
    loader = cornerstone.loadImage(targetStackData.imageIds[targetIndex]);
  } else {
    loader = cornerstone.loadAndCacheImage(targetStackData.imageIds[targetIndex]);
  }

  loader.then(function (image) {
    const viewport = cornerstone.getViewport(targetElement);

    targetStackData.currentImageIdIndex = targetIndex;
    synchronizer.displayImage(targetElement, image, viewport);
    if (endLoadingHandler) {
      endLoadingHandler(targetElement, image);
    }
  }, function (error) {
    const imageId = targetStackData.imageIds[targetIndex];

    if (errorLoadingHandler) {
      errorLoadingHandler(targetElement, imageId, error);
    }
  });
  /*
  const sourceEnabledElement = cornerstone.getEnabledElement(sourceElement);
  const sourceImagePlane = cornerstone.metaData.get('imagePlaneModule', sourceEnabledElement.image.imageId);

  if (sourceImagePlane === undefined || sourceImagePlane.imagePositionPatient === undefined) {
    return;
  }

  const sourceImagePosition = convertToVector3(sourceImagePlane.imagePositionPatient);

  const stackToolDataSource = getToolState(targetElement, 'stack');
  const stackData = stackToolDataSource.data[0];

  let minDistance = Number.MAX_VALUE;
  let newImageIdIndex = -1;

  if (!positionDifference) {
    return;
  }

  const finalPosition = sourceImagePosition.clone().add(positionDifference);

  stackData.imageIds.forEach(function (imageId, index) {

  });
  */
}
