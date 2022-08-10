import { action, computed } from "@ember/object";
import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import I18n from "I18n";
import { alias } from "@ember/object/computed";

export default Controller.extend({
    loading: false,
    isButtonDisabled: alias("loading"),

    lotteryOne() {
        if (!this.currentUser) {
            return Promise.resolve();
        }

        return ajax(`/user-points/gacha/lottery`, {
            type: "post",
        });
    },

    @action
    lottery() {
        this.set("loading", true);
        return bootbox.confirm(
            I18n.t("discourse_rewards.gacha.lottery.confirm"),
            I18n.t("no_value"),
            I18n.t("yes_value"),
            (result) => {
                if (result) {
                return this.lotteryOne()
                    .then((lottery) => {
                        // console.log(lottery);
                        const lottery_prize = lottery.lottery_prize;
                        const remaining = lottery.remaining;
                        bootbox.alert(I18n.t("discourse_rewards.gacha.lottery.result", {lottery_prize: lottery_prize, remaining:remaining}));
                        //this.send("closeModal");
                    })
                    .catch(() => {
                        bootbox.alert(I18n.t("discourse_rewards.gacha.lottery.error"));
                    })
                    .finally(() => this.set("loading", false));
                }
            }
        );
    },
});
