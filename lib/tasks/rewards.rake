# frozen_string_literal: true
desc "Grant reward points to user for creating topic, posts & receiving likes"
task "rewards:points" => [:environment] do |_, args|
  require 'highline/import'
  destroy = ask("You are about to Grant reward points to user for creating topic, posts & receiving likes, are you sure ? y/n  ")

  if destroy.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  # DiscourseRewards::UserPoint.where(user_badge_id: nil, user_points_category_id: [2, 4]).destroy_all

  earlist_record_time = DiscourseRewards::UserPoint.order("created_at").first.created_at
  end_time_of_calculate = earlist_record_time - 1.second

  posts = Post.where(created_at: Time.zone.now.beginning_of_year..end_time_of_calculate).where("user_id > 0").order("created_at")
  # posts = Post.where("user_id > 0").order("created_at")

  destroy_post = ask( posts.count.to_s + "posts need to create point record. are you sure ? y/n  ")

  if destroy_post.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  posts.each do |post|
    next if !post.topic
    next if post.topic.archetype == Archetype.private_message
    next if !post.topic.category

    description = nil
    points = nil

    if post.post_number == 1
      description = {
        type: 'topic',
        post_number: 1,
        topic_slug: post.topic.slug,
        topic_id: post.topic.id,
        topic_title: post.topic.title
      }

      points = post.topic.category.custom_fields['rewards_points_for_topic_create'].to_i

      points = SiteSetting.discourse_rewards_points_for_topic_create.to_i if points <= 0

    else
      description = {
        type: 'post',
        post_id: post.id,
        post_number: post.post_number,
        topic_slug: post.topic.slug,
        topic_id: post.topic.id,
        topic_title: post.topic.title
      }

      points = SiteSetting.discourse_rewards_points_for_post_create.to_i
    end

    DiscourseRewards::UserPoint.create(user_id: post.user_id, reward_points: points, created_at: post.created_at, updated_at: post.created_at, user_points_category_id: 2, description: description.to_json) if points > 0
    puts "create point record for post " + post.id.to_s
  end

  puts "Creating post points records finished!"

  likes = PostAction.where(post_action_type_id: PostActionType.types[:like]).where(created_at: Time.zone.now.beginning_of_year..end_time_of_calculate).order("created_at")
  # likes = PostAction.where(post_action_type_id: PostActionType.types[:like]).order("created_at")

  destroy_like = ask( likes.count.to_s + "likes need to create point record. are you sure ? y/n  ")

  if destroy_like.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  likes.each do |like|
    next if !like.post.topic
    next if like.post.topic.archetype == Archetype.private_message

    description = {
      type: 'like',
      post_id: like.post.id,
      post_number: like.post.post_number,
      topic_id: like.post.topic.id,
      topic_slug: like.post.topic.slug,
      topic_title: like.post.topic.title
    }

    points = SiteSetting.discourse_rewards_points_for_like_received.to_i

    DiscourseRewards::UserPoint.create(user_id: like.post.user_id, reward_points: points, created_at: like.created_at, updated_at: like.created_at, user_points_category_id: 4, description: description.to_json) if points > 0
    puts "create point record for like " + like.id.to_s
  end
  puts "Creating like points records finished!"
end

desc "Add Category to all points granted till date"
task "rewards:add_points_category" => [:environment] do |_, args|
  require 'highline/import'
  update = ask("You are about to add category to all the transactions/points ? y/n  ")

  if update.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  DiscourseRewards::UserPoint.where.not(user_badge_id: nil).update_all(user_points_category_id: 1)
  DiscourseRewards::UserPoint.where(user_badge_id: nil).each do |user_point|
    description = JSON.parse(user_point.description).with_indifferent_access
    if description[:type] == "topic" || description[:type] == "post"
      user_point.update(user_points_category_id: 2)
    end

    if description[:type] == "daily_login"
      user_point.update(user_points_category_id: 3)
    end

    if description[:type] == "like"
      user_point.update(user_points_category_id: 4)
    end
  end
end
