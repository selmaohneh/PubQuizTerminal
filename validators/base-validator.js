export class BaseValidator {
  validate(data) {
    throw new Error('validate() must be implemented by subclass');
  }

  createResult(isValid, errors = []) {
    return { isValid, errors };
  }

  success() {
    return this.createResult(true);
  }

  failure(...errors) {
    return this.createResult(false, errors);
  }
}
