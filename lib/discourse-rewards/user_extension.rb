# frozen_string_literal: true

module DiscourseRewards::UserExtension
  def self.prepended(base)
    base.has_many :user_points, class_name: 'DiscourseRewards::UserPoint'
    base.has_many :user_rewards, class_name: 'DiscourseRewards::UserReward'
    base.has_many :rewards, class_name: 'DiscourseRewards::Reward'
    base.has_one :total_point, class_name: 'DiscourseRewards::TotalPoint'
  end

  def get_total_earned_points
    self.total_point ? self.total_point.read_attribute(:total_earned_points) : 0
  end
  
  def get_available_points
    self.total_point ? self.total_point.read_attribute(:available_points) : 0
  end
end
