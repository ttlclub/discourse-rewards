import DiscourseRoute from "discourse/routes/discourse";
import { ajax } from "discourse/lib/ajax";

export default DiscourseRoute.extend({
  // controllerName: 'points-center-gacha',
  model() {
    // return ajax("/rewards-leaderboard.json").then((data) => {
    //   return data;
    // });
  },
  setupController(controller, model) {
    controller.setProperties({
      model,
    });
  },
});
