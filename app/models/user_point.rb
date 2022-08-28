# frozen_string_literal: true

module DiscourseRewards
  class UserPoint < ActiveRecord::Base
    self.table_name = 'discourse_rewards_user_points'

    belongs_to :user
    belongs_to :user_badge
    belongs_to :user_points_category
    belongs_to :total_point

    after_create :update_total_points

    def self.user_total_points(user)
      UserPoint.where(user_id: user.id).sum(:reward_points)
    end

    def update_total_points
      total_point_record = TotalPoint.find_or_initialize_by(user_id: self.user_id)
      total_point_record.update!(total_earned_points: (total_point_record.total_earned_points || 0) + self.reward_points, available_points: (total_point_record.available_points|| 0) + self.reward_points)
    end
  end
end
