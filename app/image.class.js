const CHANNELS = {
  'R': 0,
  'G': 1,
  'B': 2,
  'A': 3,
  'length': 4
};

export default class Image {
  constructor(imageSelector, canvasSelector) {
    this.imageSelector = imageSelector;
    this.canvasSelector = canvasSelector;
    this.width = 0;
    this.height = 0;
    this.isLoaded = false;
    this.imageVector = null;

    $(this.imageSelector).on('change', this._loadFile.bind(this));
  }

  static toRadians(angle) {
    return angle * (Math.PI / 180);
  }

  static truncateChannel(channelValue, factor = 1, bias = 0) {
    return Math.min(Math.max(Math.floor(factor * channelValue + bias), 0), 255);
  }

  static getClosest(values, targetValue) {
    let closest = values[0];
    let diff = Math.abs(closest - targetValue);

    values.forEach((val) => {
      let currentDiff = Math.abs(val - targetValue);

      if (currentDiff < diff) {
        closest = val;
        diff = currentDiff;
      }
    });

    return closest;
  }

  static convertImageDataToVector(imageData) {
    let result = [];

    for (let i = 0; i < imageData.length; i += 4) {
      result.push({
        r: imageData[i],
        g: imageData[i + 1],
        b: imageData[i + 2],
        a: imageData[i + 3]
      });
    }

    return result;
  }

  static convertImageVectorToMatrix(imageData, width, height) {
    let result = [];
    let index = 0;

    for (let y = 0; y < height; y++) {
      result[y] = [];

      for (let x = 0; x < width; x++) {
        result[y][x] = imageData[index];
        index++;
      }
    }

    return result;
  }

  static centerImageMatrix(imageMatrix, newSize) {
    let newMatrix = [];
    let height = imageMatrix.length;
    let width = imageMatrix[0].length;
    let heightIndent = (newSize - height) / 2;
    let widthIndent = (newSize - width) / 2;

    for (let y = 0; y < newSize; y++) {
      let lastY = [];

      newMatrix.push(lastY);

      if (y < heightIndent || y > heightIndent + height) {
        for (let x = 0; x < newSize; x++) {
          lastY.push({r: 0, g: 0, b: 0, a: 0});
        }
      } else {
        let lastOriginalY = imageMatrix.shift();

        for (let x = 0; x < newSize; x++) {
          if (x < widthIndent || x > widthIndent + width) {
            lastY.push({r: 0, g: 0, b: 0, a: 0});
          } else {
            lastY.push(lastOriginalY.shift());
          }
        }
      }
    }

    return newMatrix;
  }

  _loadFile(event) {
    let file = event.target.files[0];

    this.isLoaded = false;

    if (file) {
      let img = $('<img>', {
        src: URL.createObjectURL(file)
      });

      img.on('load', () => this._prepareImage(img[0]));
    }
  }

  _getContext() {
    return $(this.canvasSelector)[0].getContext('2d');
  }

  _prepareImage(img) {
    let canvas = $(this.canvasSelector)[0];
    let context = this._getContext();

    this.height = img.height;
    this.width = img.width;
    this.isLoaded = true;

    canvas.height = this.height;
    canvas.width = this.width;

    URL.revokeObjectURL(img.src);
    context.drawImage(img, 0, 0);

    this.imageVector = Image.convertImageDataToVector(this._getImageData().data);
  }

  _getImageData() {
    return this._getContext().getImageData(0, 0, this.width, this.height);
  }

  _restoreImageDataFromVector(imageVector, width = this.width, height = this.height) {
    let imageData = this._getContext().createImageData(width, height);

    for (let i = 0, j = 0; j < imageVector.length; i += 4, j++) {
      imageData.data[i] = imageVector[j].r;
      imageData.data[i + 1] = imageVector[j].g;
      imageData.data[i + 2] = imageVector[j].b;
      imageData.data[i + 3] = imageVector[j].a;
    }

    return imageData;
  }

  _restoreImageDataFromMatrix(matrix, width, height) {
    let imageData = this._getContext().createImageData(width, height);
    let index = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (matrix[y] && matrix[y][x]) {
          imageData.data[index] = matrix[y][x].r;
          imageData.data[index + 1] = matrix[y][x].g;
          imageData.data[index + 2] = matrix[y][x].b;
          imageData.data[index + 3] = matrix[y][x].a;
        } else {
          if (!matrix[y]) {
            matrix[y] = [];
          }
          for (let i = 0; i < 4; i++) {
            imageData.data[index + i] = 0;
          }
        }
        index += 4;
      }
    }

    return imageData;
  }

  applyFilter(imageVector, filter, factor = 1, bias = 0, width = this.width, height = this.height) {
    let filterHeight = filter.length;
    let filterWidth = filter[0].length;
    let result = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let red = 0;
        let green = 0;
        let blue = 0;

        for(let filterY = 0; filterY < filterHeight; filterY++) {
          for(let filterX = 0; filterX < filterWidth; filterX++) {
            let imageX = Math.floor((x - filterWidth / 2 + filterX + width) % this.width);
            let imageY = Math.floor((y - filterHeight / 2 + filterY + height) % height);
            let currentFilterValue = filter[filterY][filterX];
            let currentPixel = imageVector[imageY * width + imageX];

            red += currentPixel.r * currentFilterValue;
            green += currentPixel.g * currentFilterValue;
            blue += currentPixel.b * currentFilterValue;
          }
        }

        result[y * width + x] = {
          r: Image.truncateChannel(red, factor, bias),
          g: Image.truncateChannel(green, factor, bias),
          b: Image.truncateChannel(blue, factor, bias),
          a: imageVector[y * width + x].a
        };
      }
    }

    return result;
  }

  createAnaglyph(image) {
    let firstImageData = this._getImageData();
    let secondImageData = image._getImageData();
    let index = Math.min(firstImageData.data.length, secondImageData.data.length);

    while(index--) {
      firstImageData.data[index] = index % CHANNELS.length === CHANNELS.R ?
        firstImageData.data[index] :
        secondImageData.data[index];
    }

    return firstImageData;
  }

  blurFilter() {
    let filterMatrix = [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0]
    ];

    return this._restoreImageDataFromVector(this.applyFilter(this.imageVector, filterMatrix, 1/13, 0));
  }

  findEdges() {
    let filterMatrix = [
      [0, 0, -1, 0, 0],
      [0, 0, -1, 0, 0],
      [0, 0,  2, 0, 0],
      [0, 0,  0, 0, 0],
      [0, 0,  0, 0, 0]
    ];

    return this._restoreImageDataFromVector(this.applyFilter(this.imageVector, filterMatrix, 1, 0));
  }

  sharpenFilter() {
    let filterMatrix = [
      [-1, -1, -1],
      [-1,  9, -1],
      [-1, -1, -1]
    ];

    return this._restoreImageDataFromVector(this.applyFilter(this.imageVector, filterMatrix, 1, 0));
  }

  segmentation(numberOfSegments = 1) {
    let centersOfMass = this.getRandomCentersOfMass(numberOfSegments);
    let keysOfCentersOfMass = Array.from(centersOfMass.keys());
    let imageData = this.imageVector.map((pixelData) => {
      let pixelSum = pixelData.r  + pixelData.g + pixelData.b;
      let key = Image.getClosest(keysOfCentersOfMass, pixelSum);

      return centersOfMass.get(key);
    });

    return this._restoreImageDataFromVector(imageData);
  }

  getRandomCentersOfMass(numberOfSegments) {
    let centersOfMass = new Map();

    while (numberOfSegments--) {
      let pixelData = this.imageVector[Math.floor(Math.random() * this.imageVector.length)];
      let key = pixelData.r + pixelData.g + pixelData.b;

      if (centersOfMass.get(key)) {
        numberOfSegments++;
      } else {
        centersOfMass.set(key, pixelData);
      }
    }

    return centersOfMass;
  }

  rotation(angle) {
    let newSize = Math.ceil(Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)));
    let imageMatrix =
      Image.centerImageMatrix(Image.convertImageVectorToMatrix(this.imageVector, this.width, this.height), newSize);
    let angleInRadians = Image.toRadians(angle);
    let height = imageMatrix.length;
    let width = imageMatrix[0].length;
    let xo = width / 2;
    let yo = height / 2;
    let newMatrix = [];

    for (let y = 0; y < height; y++) {
      newMatrix[y] = [];

      for (let x = 0; x < width; x++) {
        let newX = Math.round(Math.cos(angleInRadians) * (x - xo) - Math.sin(angleInRadians) * (y - yo) + xo);
        let newY = Math.round(Math.sin(angleInRadians) * (x - xo) + Math.cos(angleInRadians) * (y - yo) + yo);

        if (imageMatrix[newY] && imageMatrix[newY][newX]) {
          newMatrix[y][x] = imageMatrix[newY][newX]
        }
      }
    }

    return this._restoreImageDataFromMatrix(newMatrix, newSize, newSize);
  }

  scaling(scalingRatio) {
    let newWidth = this.width * scalingRatio;
    let newHeight = this.height * scalingRatio;
    let imageMatrix = Image.convertImageVectorToMatrix(this.imageVector, this.width, this.height);
    let newMatrix = [];

    for (let y = 0; y < newHeight; y++) {
      newMatrix[y] = [];

      for (let x = 0; x < newWidth; x++) {
        let newX = Math.round(x / scalingRatio);
        let newY = Math.round(y / scalingRatio);

        if (imageMatrix[newY] && imageMatrix[newY][newX]) {
          newMatrix[y][x] = imageMatrix[newY][newX]
        }
      }
    }

    return this._restoreImageDataFromMatrix(newMatrix, newWidth, newHeight);
  }

}
