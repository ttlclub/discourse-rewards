import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import Reward from "../models/reward";
import I18n from "I18n";
import bootbox from "bootbox";
import { ajax } from "discourse/lib/ajax";
import UserPoint from "../models/user-point";

export default Controller.extend({
  routing: service("-routing"),
  page: 0,
  loading: false,
  buttonLoading: false,

  init() {
    this._super(...arguments);

    this.messageBus.subscribe(`/u/rewards`, (data) => {
      this.replaceReward(data);
    });
  },

  replaceReward(data) {
    if(!this.model) {
      return;
    }
    let index = this.model.rewards.indexOf(
      this.model.rewards.find(
        (searchReward) => searchReward.id === data.reward_id
      )
    );

    if (data.create) {
      if (index < 0) {
        this.model.rewards.unshiftObject(Reward.createFromJson(data));
      }

      return;
    }

    if (data.destroy) {
      if (index >= 0) {
        this.model.rewards.removeObject(this.model.rewards[index]);
      }

      return;
    }

    this.model.rewards.removeObject(this.model.rewards[index]);
    this.model.rewards.splice(index, 0, Reward.createFromJson(data));

    this.set("model.rewards", this.model.rewards);
  },

  findRewards() {
    if (this.page * 30 >= this.model.count) {
      return;
    }

    if (this.loading || !this.model) {
      return;
    }

    this.set("loading", true);
    this.set("page", this.page + 1);

    ajax("/rewards.json", {
      type: "GET",
      data: { page: this.page },
    })
      .then((result) => {
        this.model.rewards.pushObjects(Reward.createFromJson(result).rewards);
      })
      .finally(() => this.set("loading", false));
  },

  pointsUpdate() {
    UserPoint.update()
      .then((result) => {
        if (result.available_points) {
          this.currentUser.set("available_points", result.available_points);
          // this.scheduleRerender();
        }
        //console.log(result);
    });
  },

  @action
  loadMore() {
    this.findRewards();
  },

  @action
  grant(reward) {
    if (!reward || !reward.id) {
      return;
    }

    return bootbox.confirm(
      I18n.t("admin.rewards.redeem_confirm"),
      I18n.t("no_value"),
      I18n.t("yes_value"),
      (result) => {
        if (result) {
          this.set("buttonLoading", true);
          return Reward.grant(reward)
            .then(() => {
              this.pointsUpdate();
              this.send("closeModal");
              bootbox.alert(I18n.t("admin.rewards.redeem_success"));
            })
            .catch(() => {
              const xhr = e.jqXHR;
              let errorType = xhr.responseJSON["error_type"]
              let errorText = "";
              if (errorType === "quantity_limit") {
                  errorText = I18n.t("discourse_rewards.available_rewards.redeem.error_balance")
              } else if (errorType === "insufficient_balance") {
                  errorText = I18n.t("discourse_rewards.available_rewards.redeem.error_quantity")
              } else {
                  errorText = I18n.t("discourse_rewards.gacha.lottery.error")
              }
              bootbox.alert(errorText);
              //bootbox.alert(I18n.t("discourse_rewards.generic_error"));
            })
            .finally(() => this.set("buttonLoading", false));
        }
      }
    );
  },
});
