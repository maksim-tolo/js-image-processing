import Image from './image.class';

class MainController {
  constructor() {
    this.leftImage = new Image('#left-image-chooser', '#left-image');
    this.rightImage = new Image('#right-image-chooser', '#right-image');

    $('#create-anaglyph').on('click', this.createAnaglyph.bind(this));
    $('#blur-filter').on('click', this.blurFilter.bind(this));
    $('#find-edges').on('click', this.findEdges.bind(this));
    $('#sharpen-filter').on('click', this.sharpenFilter.bind(this));
    $('#segmentation').on('click', this.segmentation.bind(this));
    $('#rotation-angle').on('change input', this.rotation.bind(this));
    $('#scaling-ratio').on('change', this.scaling.bind(this));
  }

  applyFilter(imageData) {
    let resultCanvas = $('#result')[0];
    let context = resultCanvas.getContext('2d');

    resultCanvas.height = imageData.height;
    resultCanvas.width = imageData.width;

    context.putImageData(imageData, 0, 0);
  }

  createAnaglyph() {
    if (this.leftImage.isLoaded && this.rightImage.isLoaded) {
      this.applyFilter(this.leftImage.createAnaglyph(this.rightImage));
    }
  }

  blurFilter() {
    if (this.leftImage.isLoaded) {
      this.applyFilter(this.leftImage.blurFilter());
    }
  }

  findEdges() {
    if (this.leftImage.isLoaded) {
      this.applyFilter(this.leftImage.findEdges());
    }
  }

  sharpenFilter() {
    if (this.leftImage.isLoaded) {
      this.applyFilter(this.leftImage.sharpenFilter());
    }
  }

  segmentation() {
    let numberOfSegments = parseInt($('#number-of-segments').val());

    if (this.leftImage.isLoaded && numberOfSegments) {
      this.applyFilter(this.leftImage.segmentation(numberOfSegments));
    }
  }

  rotation() {
    let angle = parseInt($('#rotation-angle').val());

    if (this.leftImage.isLoaded && angle) {
      this.applyFilter(this.leftImage.rotation(angle));
    }
  }

  scaling() {
    let scalingRatio = parseFloat($('#scaling-ratio').val());

    $('#scaling-ratio-value').text(`${scalingRatio}x`);

    if (this.leftImage.isLoaded && scalingRatio) {
      this.applyFilter(this.leftImage.scaling(scalingRatio));
    }
  }
}

new MainController();
