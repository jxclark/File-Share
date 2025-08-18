import { UserDocument } from "../models/user.models";


declare global {
    namespace Express {
        interface User extends UserDocument {
            _id?: any;
            password?: any;
        }
    }
}