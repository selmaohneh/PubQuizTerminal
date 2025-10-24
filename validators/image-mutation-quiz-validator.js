import { BaseValidator } from './base-validator.js';

export class ImageMutationQuizValidator extends BaseValidator {
  validate(data) {
    if (!Array.isArray(data)) {
      return this.failure('Quiz data must be an array');
    }

    if (data.length < 1) {
      return this.failure('Must have at least 1 image mutation pair');
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (!item.mutatedImage || typeof item.mutatedImage !== 'string') {
        return this.failure(`Item ${i + 1} must have a valid mutatedImage filename`);
      }

      if (!item.originalImage || typeof item.originalImage !== 'string') {
        return this.failure(`Item ${i + 1} must have a valid originalImage filename`);
      }

      if (item.mutatedImage.trim() === '' || item.originalImage.trim() === '') {
        return this.failure(`Item ${i + 1} has empty mutatedImage or originalImage`);
      }
    }

    return this.success();
  }
}

