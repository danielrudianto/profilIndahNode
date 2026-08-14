import { getIO } from "./io.helper";

class SocketHelper {
  event_name: string;
  event_data: any;

  constructor(event_name: string, event_data: any = null) {
    this.event_data = event_data;
    this.event_name = event_name;
  }

  create() {
    getIO().emit(this.event_name, this.event_data);
  }
}

export default SocketHelper;
