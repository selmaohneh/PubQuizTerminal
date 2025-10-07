import { BaseValidator } from './base-validator.js';

export class ImageQuizValidator extends BaseValidator {
  validate(data) {
    if (!Array.isArray(data)) {
      return this.failure('Quiz data must be an array');
    }

    if (data.length < 1) {
      return this.failure('Must have at least 1 image');
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (!item.image || typeof item.image !== 'string') {
        return this.failure(`Item ${i + 1} must have a valid image filename`);
      }

      if (!item.answer || typeof item.answer !== 'string') {
        return this.failure(`Item ${i + 1} must have a valid answer`);
      }

      if (item.image.trim() === '' || item.answer.trim() === '') {
        return this.failure(`Item ${i + 1} has empty image or answer`);
      }
    }

    return this.success();
  }
}
