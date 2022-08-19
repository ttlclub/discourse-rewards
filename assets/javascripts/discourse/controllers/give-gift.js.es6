import Controller from "@ember/controller";
import EmberObject, { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { isEmpty } from "@ember/utils";
import { ajax } from "discourse/lib/ajax";
import UserPoint from "../models/user-point";

export default Controller.extend({
  gift_points: "",
  forceValidationReason: false,
  loading: false,

  giveGift(points) {
    if (!points) {
      return Promise.resolve();
    }

    return ajax(`/user-points/gift/${this.model.id}`, {
      type: "post",
      data: { points: points },
    });
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
  submitGift() {
    this.set("forceValidationReason", true);
    const validation = this.pointsValidation.failed;

    if (validation) {
      const element = validation.element;
      if (element) {
        if (element.tagName === "DIV") {
          if (element.scrollIntoView) {
            element.scrollIntoView();
          }
          element.click();
        } else {
          element.focus();
        }
      }
      return;
    }

    this.set("loading", true);
    if (this.gift_points) {
      // debugger
      this.giveGift(this.gift_points).then((result) => {
        this.pointsUpdate();
        this.send("closeModal");
        bootbox.alert(I18n.t("discourse_rewards.gift.result.success"));
      })
      .catch((error) => {
        this.send("closeModal");
        const xhr = e.jqXHR;
        let errorType = xhr.responseJSON["error_type"]
        let errorText = "";
        if (errorType === "private_message") {
          errorText = I18n.t("discourse_rewards.gift.result.error_private")
        } else if (errorType === "insufficient_balance") {
          errorText = I18n.t("discourse_rewards.gift.result.error_balance")
        } else {
          errorText = I18n.t("discourse_rewards.gift.result.error")
        }
        bootbox.alert(errorText);
        //bootbox.alert(I18n.t("discourse_rewards.gift.result.error"));
        throw new Error(error);
      })
      .finally(() => this.set("loading", false));
    }
  },

  // Check the points
  @discourseComputed("gift_points", "forceValidationReason", "currentUser.available_points")
  pointsValidation(points, forceValidationReason, available_points) {
    const failedAttrs = {
      failed: true,
      ok: false,
      element: document.querySelector("#points"),
    };

    // If blank, fail without a reason
    if (isEmpty(points)) {
      return EmberObject.create(
        Object.assign(failedAttrs, {
          message: I18n.t("discourse_rewards.gift.points_validation.required"),
          reason: forceValidationReason
            ? I18n.t("discourse_rewards.gift.points_validation.required")
            : null,
        })
      );
    }

    if (!(parseInt(points, 10) > 0)) {
      return EmberObject.create(
        Object.assign(failedAttrs, {
          message: I18n.t("discourse_rewards.gift.points_validation.less_than_1"),
          reason: forceValidationReason
            ? I18n.t("discourse_rewards.gift.points_validation.less_than_1")
            : null,
        })
      );
    }
    if (parseInt(points, 10) > available_points) {
      return EmberObject.create(
        Object.assign(failedAttrs, {
          message: I18n.t("discourse_rewards.gift.points_validation.over_balance"),
          reason: forceValidationReason
            ? I18n.t("discourse_rewards.gift.points_validation.over_balance")
            : null,
        })
      );
    }

    return EmberObject.create({
      ok: true,
      reason: I18n.t("discourse_rewards.gift.points_validation.ok"),
    });
  },

});
