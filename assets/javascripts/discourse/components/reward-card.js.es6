import Component from "@ember/component";
import showModal from "discourse/lib/show-modal";
import { action, computed } from "@ember/object";
import { userPath } from "discourse/lib/url";
import discourseComputed from "discourse-common/utils/decorators";

export default Component.extend({
  allTypes: null,

  init() {
    this._super(...arguments);
    this.setTypes();
  },

  setTypes() {
    const types = this.get("siteSettings.discourse_rewards_rewards_types").split("|")
    this.set("allTypes", types);
  },

  @computed("username")
  get path() {
    return userPath(this.username);
  },

  click() {
    showModal("reward-view", {
      model: {
        reward: this.reward,
        grant: this.grant,
        redeem: this.redeem,
        user_reward: this.user_reward,
      },
    });
  },

  @computed("currentUser.available_points", "reward.points")
  get disableRedeemButton() {
    return (
      this.reward.points > this.currentUser.available_points ||
      this.reward.quantity < 1
    );
  },

  @discourseComputed
  rewardTypes() {
    const types = this.allTypes.map((x, index) => {
      return {id: index + 1, name: x}
    });
    return types;
  },

  @discourseComputed
  rewardType() {
    // debugger
    return this.rewardTypes.find(item => item.id == this.reward.category).name
  },

  @action
  editReward(reward) {
    showModal("admin-reward-form", {
      model: {
        reward: reward,
        save: this.save,
        destroy: this.destroy,
      },
    });
  },

  @action
  grantReward(reward) {
    this.grant(reward);
  },

  @action
  grantUserReward(user_reward) {
    this.grant(user_reward);
  },

  @action
  cancelUserReward(user_reward, reason) {
    showModal("cancel-reward", {
      model: {
        cancelReward: this.cancelReward,
        user_reward: user_reward,
      },
    });
  },
});
