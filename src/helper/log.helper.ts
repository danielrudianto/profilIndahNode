import fs from "fs";

class LogHelper {
  static log(date: Date, type: string, event: string, location: string, done_by: number) {
    if(type === "error"){
      fs.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event.replace(/\n|\r|, /g, ",")}; ${location}; ${done_by}\r\n`);
    } else {
      fs.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event}; ${location}; ${done_by}\r\n`);
    }
    
  }
}

export default LogHelper;
