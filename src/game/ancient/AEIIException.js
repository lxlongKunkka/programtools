export default class AEIIException extends Error {
    constructor(message) {
        super(message);
        this.name = "AEIIException";
    }
}
