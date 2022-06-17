import UserModel from "../model/user.model";

class AuthController {
    static getRoles(){
        return UserModel.roles.filter(x => x.available);
    }
}

export default AuthController;