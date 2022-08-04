import DropdownSelectBoxComponent from "select-kit/components/dropdown-select-box";
import I18n from "I18n";
import { computed } from "@ember/object";
import { setting } from "discourse/lib/computed";

export default DropdownSelectBoxComponent.extend({
  classNames: ["points-category-filter"],
  showBadges: setting("enable_badges"),
  

  content: computed(function () {

    let badgefilter = {
        id: "badge",
        label: I18n.t("discourse_rewards.transaction.categories.badge"),
      };
      
    let filterArr = [
      {
        id: "all",
        label: I18n.t("user.user_notifications.filters.all"),
      },
      {
        id: "creation",
        label: I18n.t("discourse_rewards.transaction.categories.creation"),
      },
      {
        id: "daily_login",
        label: I18n.t("discourse_rewards.transaction.categories.daily_login"),
      },
      {
        id: "like",
        label: I18n.t("discourse_rewards.transaction.categories.like"),
      },
      {
        id: "gift_received",
        label: I18n.t("discourse_rewards.transaction.categories.gift_received"),
      },
      {
        id: "gift_given",
        label: I18n.t("discourse_rewards.transaction.categories.gift_given"),
      },
      {
        id: "redeem",
        label: I18n.t("discourse_rewards.transaction.categories.redeem"),
      },
    ];

    if(this.showBadges) {
      filterArr.push(badgefilter);
    }
    
    return filterArr;
    
  }),

  selectKitOptions: {
    headerComponent: "points-category-filter-header",
  },
});
