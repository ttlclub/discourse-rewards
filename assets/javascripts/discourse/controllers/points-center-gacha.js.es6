import { action, computed } from "@ember/object";
import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import I18n from "I18n";
import { alias } from "@ember/object/computed";
import UserPoint from "../models/user-point";

export default Controller.extend({
    loading: false,
    isButtonDisabled: computed("loading", "currentUser.available_points", function(){
        return (
            this.currentUser.available_points < parseInt(this.get("siteSettings.discourse_rewards_lottery_points_spent_per_time")) ||
            this.loading
        );
    }),

    lotteryOne() {
        if (!this.currentUser) {
            return Promise.resolve();
        }

        return ajax(`/user-points/gacha/lottery`, {
            type: "post",
        });
    },
    
    pointsUpdate() {
        UserPoint.update()
          .then((result) => {
            if (result.available_points) {
              this.currentUser.set("available_points", result.available_points);
              // this.scheduleRerender();
            }
            console.log(result);
        });
    },

    @action
    lottery() {
        this.pointsUpdate();
        return bootbox.confirm(
            I18n.t("discourse_rewards.gacha.lottery.confirm"),
            I18n.t("no_value"),
            I18n.t("yes_value"),
            (result) => {
                if (result) {
                this.set("loading", true);
                return this.lotteryOne()
                    .then((lottery) => {
                        // console.log(lottery);
                        const lottery_prize = lottery.lottery_prize;
                        const remaining = lottery.remaining;
                        this.pointsUpdate();
                        bootbox.alert(I18n.t("discourse_rewards.gacha.lottery.result", {lottery_prize: lottery_prize, remaining:remaining}));
                        //this.send("closeModal");
                    })
                    .catch((e) => {
                        const xhr = e.jqXHR;
                        let errorType = xhr.responseJSON["error_type"]
                        let errorText = "";
                        if (errorType === "rate_limit") {
                            errorText = I18n.t("discourse_rewards.gacha.lottery.error")
                        } else if (errorType === "insufficient_balance") {
                            errorText = I18n.t("discourse_rewards.gacha.lottery.error_balane")
                        } else {
                            errorText = I18n.t("discourse_rewards.gacha.lottery.error")
                        }
                        bootbox.alert(errorText);
                    })
                    .finally(() => this.set("loading", false));
                }
            }
        );
    },
});
