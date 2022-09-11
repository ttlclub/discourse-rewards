import Component from "@ember/component";
import { computed } from "@ember/object";
import { postUrl } from "discourse/lib/utilities";
import { alias, equal, or } from "@ember/object/computed";
import getURL from "discourse-common/lib/get-url";
import I18n from "I18n";

export default Component.extend({
  tagName: "tr",
  classNames: ["transaction-item"],
  isGiftGiven: equal("transaction.user_points_category.id", 7),
  isLotteryOut: equal("transaction.user_points_category.id", 8),
  isUserReward: alias("transaction.user_reward"),
  isNegative: or("isUserReward", "isGiftGiven", "isLotteryOut"),

  @computed("transaction.reward_points")
  get absPoints() {
    return Math.abs(this.transaction.reward_points);
  },

  @computed("transaction.reward", "transaction.user_point")
  get details() {
    if (this.transaction.user_reward) {
      return I18n.t("discourse_rewards.my_points_center.redeemed", {
        title: this.transaction.user_reward.reward.title,
      });
    } else if (this.transaction.user_point.description) {
      const description = JSON.parse(this.transaction.user_point.description);

      if (description.type === "topic") {
        return I18n.t("discourse_rewards.my_points_center.topic_create", {
          title: description.topic_title,
        });
      } else if (description.type === "like") {
        return I18n.t("discourse_rewards.my_points_center.like_received", {
          post_id: description.post_id,
        });
      } else if (description.type === "post") {
        return I18n.t("discourse_rewards.my_points_center.post_create", {
          title: description.topic_title,
        });
      } else if (description.type === "daily_login") {
        return I18n.t("discourse_rewards.my_points_center.daily_login", {
          date: description.date,
        });
      } else if (description.type === "gift_received"){
        return I18n.t("discourse_rewards.my_points_center.gift_received", {
          username: description.username,
          title: description.topic_title,
        });
      } else if (description.type === "gift_given"){
        return I18n.t("discourse_rewards.my_points_center.gift_given", {
          username: description.username,
          title: description.topic_title,
        });
      } else if (description.type === "lottery_out"){
        if(description.hit_rare_prizes) {
          return I18n.t("discourse_rewards.my_points_center.lottery_out_rare_hit", {
            date: description.date,
            hit_rare_prizes: description.hit_rare_prizes
          });
        }
        return I18n.t("discourse_rewards.my_points_center.lottery_out", {
          date: description.date,
        });
      } else if (description.type === "lottery_in"){
        return I18n.t("discourse_rewards.my_points_center.lottery_in", {
          date: description.date,
        });
      } else {
        return I18n.t("discourse_rewards.my_points_center.badge", {
          title: description.name,
        });
      }
    }

    return I18n.t("discourse_rewards.my_points_center.earned_points");
  },

  get url() {
    if (
      !this.transaction ||
      !this.transaction.user_point ||
      !this.transaction.user_point.description
    )
      return;

    let data = JSON.parse(this.transaction.user_point.description);

    const badgeId = data.badge_id;
    if (badgeId) {
      let badgeSlug = data.badge_slug;

      if (!badgeSlug) {
        const badgeName = data.name;
        badgeSlug = badgeName.replace(/[^A-Za-z0-9_]+/g, "-").toLowerCase();
      }

      let username = this.currentUser.username;
      username = username ? "?username=" + username.toLowerCase() : "";
      return getURL("/badges/" + badgeId + "/" + badgeSlug + username);
    }

    const topicId = data.topic_id;

    if (topicId) {
      let topic_slug = data.topic_title
        .replace(/[^A-Za-z0-9_]+/g, "-")
        .toLowerCase();
      return postUrl(topic_slug, topicId, data.post_number);
    }
  },
});
