import { action, computed } from "@ember/object";
import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import I18n from "I18n";
import { alias } from "@ember/object/computed";
import UserPoint from "../models/user-point";
import Group from "discourse/models/group";

export default Controller.extend({
    loading: false,
    allGroups: null,

    isButtonDisabled: computed("loading", "currentUser.available_points", function(){
        return (
            this.currentUser.available_points < parseInt(this.get("siteSettings.discourse_rewards_lottery_points_spent_per_time")) ||
            this.loading
        );
    }),
    myGroups: computed("currentUser.groups", function() {
        return this.currentUser.groups.map(e => e.name);
    }),
    rarePrizes: computed("siteSettings.discourse_rewards_lottery_chest_rare_prizes", function(){
        return this.get("siteSettings.discourse_rewards_lottery_chest_rare_prizes").split("|");
    }),
    rarePrizesNames: computed("rarePrizes", function() {
        return this.rarePrizes.map(e => this.allGroups.findBy('name', e)?.get('full_name') ?? e );
    }),
    myRarePrizes: computed("rarePrizes", "myGroups", function(){
        // const myGroups = this.currentUser.groups.map(e => e.name);
        return this.rarePrizes.filter(e => this.myGroups.includes(e));
    }),
    notMyRarePrizes: computed("rarePrizes", "myGroups", function() {
        // const myGroups = this.currentUser.groups.map(e => e.name);
        return this.rarePrizes.filter(e => !this.myGroups.includes(e));
    }),
    myRarePrizesNames: computed("myRarePrizes", function() {
        return this.myRarePrizes.map(e => this.allGroups.findBy('name', e).get('full_name')).join(',') || '';
    }),
    notMyRarePrizesNames: computed("notMyRarePrizes", function() {
        return this.notMyRarePrizes.map(e => this.allGroups.findBy('name', e)?.get('full_name') ?? e ).join(',') || '';
    }),
    warningString: computed("myRarePrizes", function(){
        if(this.myRarePrizes.length === 0){
            return I18n.t("discourse_rewards.gacha.lottery_chest.confirm");
        } else if(this.notMyRarePrizes.length === 0) {
            return I18n.t("discourse_rewards.gacha.lottery_chest.confirm_all");
        } else {
            return I18n.t("discourse_rewards.gacha.lottery_chest.confirm_some", {
                my_rare_prizes_names: this.myRarePrizesNames,
                not_my_rare_prizes_names: this.notMyRarePrizesNames
            });
        }
    }),

    init() {
        this._super(...arguments);
        this.setGroupOptions();
      },
    
    setGroupOptions() {
        Group.findAll().then((groups) => {
            this.set("allGroups", groups.filterBy("automatic", false));
        });
    },

    setGroup(groupname, username) {
        let group = this.allGroups.find((group) => group.name === groupname);
        // let username = user_reward.user.username;
        const promise = group.addMembers(username, true, true);
        promise.then(() => {
            bootbox.alert(I18n.t("discourse_rewards.generic_error"));
        })
        .catch(() => {
            bootbox.alert(I18n.t("discourse_rewards.generic_error"));
        });
    },

    lotteryOne() {
        if (!this.currentUser) {
            return Promise.resolve();
        }

        return ajax(`/user-points/gacha/lottery`, {
            type: "post",
        });
    },

    lotteryChestOne() {
        if (!this.currentUser) {
            return Promise.resolve();
        }

        return ajax(`/user-points/gacha/lottery-chest`, {
            type: "post",
            data: { rare_prizes: this.notMyRarePrizes },
        });
    },
   
    pointsUpdate() {
        UserPoint.update()
          .then((result) => {
            if (result.available_points) {
              this.currentUser.set("available_points", result.available_points);
              // this.scheduleRerender();
            }
            // console.log(result);
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
    @action
    lotteryChest() {
        this.pointsUpdate();
        if(this.notMyRarePrizes.length === 0) {
            return bootbox.alert(this.warningString).addClass("lottery-chest done").find(".modal-body").prepend("<div class='image'></div>");
        }
        return bootbox.confirm(
            this.warningString,
            I18n.t("no_value"),
            I18n.t("yes_value"),
            (result) => {
                if (result) {
                this.set("loading", true);
                return this.lotteryChestOne()
                    .then((lottery) => {
                        const rare_hit = lottery.rare_hit;
                        const lottery_prize = lottery.lottery_prize;
                        const remaining = lottery.remaining;
                        this.pointsUpdate();
                        if(rare_hit) {
                            this.rarePrizesNames.forEach((e,index) => {
                                if(lottery_prize === e) {
                                    bootbox.alert(I18n.t("discourse_rewards.gacha.lottery_chest.result_rare", {lottery_prize: lottery_prize, remaining:remaining})).addClass("lottery-chest rare " + "rare-prize" + (index+1).toString()).find(".modal-body").prepend("<div class='image'></div>");
                                }
                            });
                        } else {
                            bootbox.alert(I18n.t("discourse_rewards.gacha.lottery_chest.result", {lottery_prize: lottery_prize, remaining:remaining})).addClass("lottery-chest money").find(".modal-body").prepend("<div class='image'></div>");
                        }
                        //this.send("closeModal");
                    })
                    .catch((e) => {
                        const xhr = e.jqXHR;
                        let errorType = xhr.responseJSON["error_type"]
                        let errorText = "";
                        if (errorType === "rate_limit") {
                            errorText = I18n.t("discourse_rewards.gacha.lottery_chest.error")
                        } else if (errorType === "insufficient_balance") {
                            errorText = I18n.t("discourse_rewards.gacha.lottery_chest.error_balane")
                        } else if (errorType === "failed_to_add_to_group") {
                            errorText = I18n.t("discourse_rewards.gacha.lottery_chest.error")
                        }
                        bootbox.alert(errorText);
                    })
                    .finally(() => this.set("loading", false));
                }
            }
        );
    },
});
