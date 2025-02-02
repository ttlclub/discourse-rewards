# frozen_string_literal: true

class DiscourseRewards::Rewards
  def initialize(user, reward = nil, user_reward = nil)
    @user = user
    @reward = reward
    @user_reward = user_reward
  end

  def add_reward(opts)
    @reward = DiscourseRewards::Reward.create(
      created_by_id: @user.id,
      points: opts[:points],
      quantity: opts[:quantity].to_i,
      title: opts[:title],
      description: opts[:description],
      upload_id: opts[:upload_id],
      upload_url: opts[:upload_url],
      category: opts[:category],
      extra: opts[:extra]
    )

    DiscourseRewards::RewardNotification.new(@reward, @user, DiscourseRewards::RewardNotification.types[:new]).create

    publish_reward!(create: true)

    link_image_to_post(opts[:upload_id])

    @reward
  end

  def update_reward(opts)
    @reward.update!(opts) if @reward

    publish_reward!(update: true)

    link_image_to_post(opts[:upload_id]) if opts[:upload_id]

    @reward
  end

  def destroy_reward
    @reward.destroy

    publish_reward!(destroy: true)

    @reward
  end

  def grant_user_reward
    @user_reward = DiscourseRewards::UserReward.create(
      user_id: @user.id,
      reward_id: @reward.id,
      status: 'applied',
      points: @reward.points
    )

    @reward.update!(quantity: @reward.quantity - 1)

    publish_reward!(quantity: true)
    publish_points!

    DiscourseRewards::RewardNotification.new(@reward, @user, DiscourseRewards::RewardNotification.types[:redeemed]).create

    @reward
  end

  def approve_user_reward
    @user_reward.update!(status: 'granted')

    PostCreator.new(
      @user,
      title: '商品发放',
      raw: "经「明星斋」审议决定，将 #{@reward.title} 售予 @#{@user_reward.user.username}。感谢惠顾。",
      category: SiteSetting.discourse_rewards_grant_topic_category,
      skip_validations: true
    ).create!

    publish_user_reward!

    @user_reward
  end

  def refuse_user_reward(opts)
    @user_reward.update!(cancel_reason: opts[:cancel_reason])
    @user_reward.destroy!
    @reward.update!(quantity: @reward.quantity + 1)

    publish_user_reward!
    publish_reward!(quantity: true)
    publish_points!

    PostCreator.new(
      @user,
      title: '无法发放商品',
      raw: " @#{@user_reward.user.username}，非常抱歉。经「明星斋」审议决定，因为 #{@user_reward.cancel_reason}，无法将 #{@user_reward.reward.title} 售予您。 其他还有一些货品在售，欢迎惠顾。 ",
      category: SiteSetting.discourse_rewards_grant_topic_category,
      skip_validations: true
    ).create!

    @user_reward
  end

  def add_to_group(group_name)
    result = nil
    
    group = Group.find_by(name: group_name) if group_name
    result = group.add(@user) if group
    # result = add_user_to_group(group, @user, true)
    GroupActionLogger.new(Discourse.system_user, group).log_add_user_to_group(@user)
    group.notify_added_to_group(@user)

    if result
      group_full_name = group.full_name.present? ? group.full_name.to_s : group_name.to_s
      return group_full_name
    else
      return "failed_to_add_to_group"
    end
  end

  private

  def link_image_to_post(upload_id)
    PostUpload.create(post_id: Post.first.id, upload_id: upload_id) unless PostUpload.find_by(upload_id: upload_id)
  end

  def publish_reward!(status = {})
    message = {
      reward_id: @reward.id,
      reward: @reward.attributes
    }.merge!(status)

    MessageBus.publish("/u/rewards", message)
  end

  def publish_points!
    user_message = {
      available_points: @user.available_points
    }

    MessageBus.publish("/u/#{@user.id}/rewards", user_message)
  end

  def publish_user_reward!
    message = {
      user_reward_id: @user_reward.id,
      user_reward: @user_reward.attributes
    }

    MessageBus.publish("/u/user-rewards", message)
  end
end
