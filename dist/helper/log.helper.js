import fs from "fs";
class LogHelper {
    static log(date, type, event, location, done_by = null) {
        if (type === "error") {
            fs.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event
                .toString()
                .replace(/(?:\r\n|\r|\n)/g, ",")}; ${location}; ${done_by}\r\n`);
        }
        else {
            fs.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event}; ${location}; ${done_by}\r\n`);
        }
    }
}
export default LogHelper;
