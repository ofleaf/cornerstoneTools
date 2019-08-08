import external from '../externalModules.js';
import convertToVector3 from '../util/convertToVector3.js';
import { clearToolOptionsByElement } from '../toolOptions.js';

function unique (array) {
  return array.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

function ImageSynchronizer (event, handler) {
  const cornerstone = external.cornerstone;
  const that = this;
  const sourceElements = [];
  const targetElements = [];

  let ignoreFiredEvents = false;
  const initialData = {};
  let eventHandler = handler;

  this.enabled = true;

  this.setHandler = function (handler) {
    eventHandler = handler;
  };

  this.getHandler = function () {
    return eventHandler;
  };

  this.getDistances = function () {
    if (!sourceElements.length || !targetElements.length) {
      return;
    }

    initialData.distances = {};
    initialData.imageIds = {
      sourceElements: [],
      targetElements: []
    };

    sourceElements.forEach(function (sourceElement) {
      const sourceEnabledElement = cornerstone.getEnabledElement(sourceElement);

      if (!sourceEnabledElement || !sourceEnabledElement.image) {
        return;
      }

      const sourceImageId = sourceEnabledElement.image.imageId;
      const sourceImagePlane = cornerstone.metaData.get('imagePlaneModule', sourceImageId);

      if (!sourceImagePlane || !sourceImagePlane.imagePositionPatient) {
        return;
      }

      const sourceImagePosition = convertToVector3(sourceImagePlane.imagePositionPatient);

      if (initialData.hasOwnProperty(sourceEnabledElement)) {
        return;
      }

      initialData.distances[sourceImageId] = {};

      initialData.imageIds.sourceElements.push(sourceImageId);

      targetElements.forEach(function (targetElement) {
        const targetEnabledElement = cornerstone.getEnabledElement(targetElement);

        if (!targetEnabledElement || !targetEnabledElement.image) {
          return;
        }

        const targetImageId = targetEnabledElement.image.imageId;

        initialData.imageIds.targetElements.push(targetImageId);

        if (sourceElement === targetElement) {
          return;
        }

        if (sourceImageId === targetImageId) {
          return;
        }

        if (initialData.distances[sourceImageId].hasOwnProperty(targetImageId)) {
          return;
        }

        const targetImagePlane = cornerstone.metaData.get('imagePlaneModule', targetImageId);

        if (!targetImagePlane || !targetImagePlane.imagePositionPatient) {
          return;
        }

        const targetImagePosition = convertToVector3(targetImagePlane.imagePositionPatient);

        initialData.distances[sourceImageId][targetImageId] = targetImagePosition.clone().sub(sourceImagePosition);
      });

      if (!Object.keys(initialData.distances[sourceImageId]).length) {
        delete initialData.distances[sourceImageId];
      }
    });
  };

  function fireEvent (sourceElement, eventData) {
    let sourceElementIndex = sourceElements.findIndex(element => element === sourceElement);

    if (!that.enabled) {
      return;
    }

    if (!sourceElements.length || !targetElements.length) {
      return;
    }

    ignoreFiredEvents = true;
    targetElements.forEach(function (targetElement, targetElementIndex) {
      const targetIndex = targetElements.indexOf(targetElement);

      if (targetIndex === -1) {
        return;
      }

      const targetImageId = initialData.imageIds.targetElements[targetIndex];
      const sourceIndex = sourceElements.indexOf(sourceElement);

      if (sourceIndex === -1) {
        return;
      }

      const sourceImageId = initialData.imageIds.sourceElements[sourceIndex];

      let positionDifference;

      if (sourceImageId === targetImageId) {
        positionDifference = 0;
      } else if (initialData.distances[sourceImageId] !== undefined) {
        positionDifference = initialData.distances[sourceImageId][targetImageId];
      }

      eventHandler(that, sourceElement, targetElement, sourceElementIndex, targetElementIndex);
    });
    ignoreFiredEvents = false;
  }

  function onEvent (e) {
    const eventData = e.detail;

    if (ignoreFiredEvents === true) {
      return;
    }

    fireEvent(e.currentTarget, eventData);
  }

  this.addSource = function (element) {
    const index = sourceElements.indexOf(element);

    if (index !== -1) {
      return;
    }

    sourceElements.push(element);

    event.split(' ').forEach((oneEvent) => {
      element.addEventListener(oneEvent, onEvent);
    });

    that.getDistances();

    that.updateDisableHandlers();
  };

  this.addTarget = function (element) {
    const index = targetElements.indexOf(element);

    if (index !== -1) {
      return;
    }

    targetElements.push(element);

    that.getDistances();

    eventHandler(that, element, element, 0);

    that.updateDisableHandlers();
  };

  this.add = function (element) {
    that.addSource(element);
    that.addTarget(element);
  };

  this.removeSource = function (element) {
    const index = sourceElements.indexOf(element);

    if (index === -1) {
      return;
    }

    sourceElements.splice(index, 1);

    event.split(' ').forEach((oneEvent) => {
      element.removeEventListener(oneEvent, onEvent);
    });

    that.getDistances();

    fireEvent(element);
    that.updateDisableHandlers();
  };

  this.removeTarget = function (element) {
    const index = targetElements.indexOf(element);

    if (index === -1) {
      return;
    }

    targetElements.splice(index, 1);

    that.getDistances();

    eventHandler(that, element, element, 0);
    that.updateDisableHandlers();
  };

  this.remove = function (element) {
    that.removeTarget(element);
    that.removeSource(element);
  };

  this.getSourceElements = function () {
    return sourceElements;
  };

  this.getTargetElements = function () {
    return targetElements;
  };

  this.displayImage = function (element, image, viewport) {
    ignoreFiredEvents = true;
    cornerstone.displayImage(element, image, viewport);
    ignoreFiredEvents = false;
  };

  this.setViewport = function (element, viewport) {
    ignoreFiredEvents = true;
    cornerstone.setViewport(element, viewport);
    ignoreFiredEvents = false;
  };

  function disableHandler (e) {
    const element = e.detail.element;

    that.remove(element);
    clearToolOptionsByElement(element);
  }

  this.updateDisableHandlers = function () {
    const elements = unique(sourceElements.concat(targetElements));

    elements.forEach(function (element) {
      element.removeEventListener(external.cornerstone.EVENTS.ELEMENT_DISABLED, disableHandler);
      element.addEventListener(external.cornerstone.EVENTS.ELEMENT_DISABLED, disableHandler);
    });
  };

  this.destroy = function () {
    const elements = unique(sourceElements.concat(targetElements));

    elements.forEach(function (element) {
      that.remove(element);
    });
  };
}

export default ImageSynchronizer;