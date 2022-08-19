import RestModel from "discourse/models/rest";
import { ajax } from "discourse/lib/ajax";

const UserPoint = RestModel.extend({});

UserPoint.reopenClass({
    update() {
        return ajax(`/user-points/update.json`, {
            type: "get",
        });
    },
});

export default UserPoint;
