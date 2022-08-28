# frozen_string_literal: true
desc "Calculate Total Points"
task "rewards:calculate_total_points" => [:environment] do |_, args|
  require 'highline/import'
  destroy = ask("You are about to claculate total points, are you sure ? y/n  ")

  if destroy.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  DiscourseRewards::TotalPoint.calculate_each_user_total_points
  puts "Total points updated"

end