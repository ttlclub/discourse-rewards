# frozen_string_literal: true

module DiscourseRewards
  class UserReward < ActiveRecord::Base
    self.table_name = 'discourse_rewards_user_rewards'

    belongs_to :user
    belongs_to :reward

    enum status: [:applied, :granted]

    after_create :update_total_points_after_create
    after_destroy :update_total_points_after_destroy

    def update_total_points_after_create
      total_point_record = TotalPoint.find_or_initialize_by(user_id: self.user_id)
      total_point_record.update!(total_spent_points: (total_point_record.total_spent_points || 0) + self.points, available_points: (total_point_record.available_points|| 0) - self.points)
    end

    def update_total_points_after_destroy
      total_point_record = TotalPoint.find_or_initialize_by(user_id: self.user_id)
      total_point_record.update!(total_spent_points: (total_point_record.total_spent_points || 0) - self.points, available_points: (total_point_record.available_points|| 0) + self.points)
    end
  end
end
