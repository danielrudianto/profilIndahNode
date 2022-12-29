import { io } from "../app";
class SocketHelper {
    constructor(event_name, event_data = null) {
        this.event_data = event_data;
        this.event_name = event_name;
    }
    create() {
        io.emit(this.event_name, this.event_data);
    }
}
export default SocketHelper;
