import Component from "@ember/component";
import { computed } from "@ember/object";

export default Component.extend({
    isShowLeaderboard: computed(function(){
        const user_preference = this.currentUser.custom_fields.discourse_rewards_show_points_leaderboard;
        const default_setting = this.get("siteSettings.discourse_rewards_show_points_leaderboard")
        if (user_preference === undefined) {
            return default_setting;
        } else {
            return user_preference;
        }
    }),
});