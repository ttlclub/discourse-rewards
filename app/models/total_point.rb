# frozen_string_literal: true

module DiscourseRewards
  class TotalPoint < ActiveRecord::Base
    self.table_name = 'discourse_rewards_total_points'

    belongs_to :user
    has_many :user_points

    def self.calculate_each_user_total_points
      DB.exec <<~SQL
        INSERT INTO discourse_rewards_total_points (user_id, total_earned_points, total_spent_points, available_points)
        SELECT earned.*, total_spent_points, (total_earned_points - COALESCE(total_spent_points, 0)) AS available_points FROM (
            SELECT up.user_id, COALESCE(SUM(up.reward_points), 0) AS total_earned_points 
            FROM discourse_rewards_user_points up
            GROUP BY 1
        ) earned LEFT JOIN (
            SELECT ur.user_id, COALESCE(SUM(ur.points), 0) AS total_spent_points 
            FROM discourse_rewards_user_rewards ur
            GROUP BY 1
        ) spent ON earned.user_id = spent.user_id
        ON CONFLICT (user_id) DO UPDATE
        SET (total_earned_points, total_spent_points, available_points) = (EXCLUDED.total_earned_points, EXCLUDED.total_spent_points, EXCLUDED.available_points)
      SQL
    end
  end
end
