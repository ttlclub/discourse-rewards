import { withPluginApi } from "discourse/lib/plugin-api";
import { h } from "virtual-dom";
import { iconNode } from "discourse-common/lib/icon-library";
import DiscourseURL from "discourse/lib/url";
import MessageBus from "message-bus-client";
import showModal from "discourse/lib/show-modal";
import UserPoint from "../models/user-point";

function initializeDiscourseRewards(api) {
  const currentUser = api.getCurrentUser();
  const siteSettings = api.container.lookup("site-settings:main");

  if (currentUser && !currentUser.is_anonymous) {
    if (siteSettings.discourse_rewards_show_points_on_site_header) {
      api.createWidget("discourse-rewards-available-points", {
        tagName: "li.discourse-rewards-available-points.icon",

        buildKey: () => `discourse-rewards-total-points`,

        buildId: () => `discourse-rewards-total-points`,

        click() {
          UserPoint.update()
          .then((result) => {
            if (result.available_points) {
              currentUser.set("available_points", result.available_points);
              this.scheduleRerender();
            }
            //console.log(result);
          });
          return DiscourseURL.routeTo("/points-center");
        },

        init() {
          MessageBus.subscribe(`/u/${currentUser.id}/rewards`, (data) => {
            if (data.available_points) {
              currentUser.set("available_points", data.available_points);
              this.scheduleRerender();
            }
          });
        },

        html() {
          let result = [
            h("div.available-points-container", {}, [
              iconNode("icon-mora"),
              h(
                "p.available-points-count",
                { title: currentUser.available_points },
                `${currentUser.available_points}`
              ),
              
            ]),
          ];

          return result;
        },
      });

      api.addToHeaderIcons("discourse-rewards-available-points");
    } else {
      api.addQuickAccessProfileItem({
        icon: "user",
        href: "/points-center",
        content: I18n.t("discourse_rewards.my_points_center.profile_link_name"),
      });
    }

    api.addPostMenuButton("certificate", () => {
      return {
        action: "giveGift",
        icon: 'certificate',
        className: 'gift',
        position: 'first'
      };
    });

    api.attachWidgetAction('post-menu', 'giveGift', function() {
      showModal("give-gift", {
        model: this.attrs,
      });

    });
  }

  api.modifyClass("controller:preferences/account", {
    pluginId: "discourse-rewards-preference",

    actions: {
      save() {
        if (!this.saveAttrNames.includes("custom_fields")) {
          this.saveAttrNames.push("custom_fields");
        }
        this._super(...arguments);
      },
    },
  });
}

export default {
  name: "discourse-rewards",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (siteSettings.discourse_rewards_enabled) {
      withPluginApi("0.10.1", initializeDiscourseRewards);
    }
  },
};
