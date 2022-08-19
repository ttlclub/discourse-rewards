# frozen_string_literal: true

module DiscourseRewards
  class RewardsController < ::ApplicationController
    requires_login
    before_action :ensure_admin, only: [:create, :update, :destroy, :grant_user_reward]

    PAGE_SIZE = 30
    TRANSACTION_PAGE_SIZE = 100

    def create
      params.require([:quantity, :title])

      raise Discourse::InvalidParameters.new(:quantity) if params[:quantity].to_i < 0
      raise Discourse::InvalidParameters.new(:title) unless params.has_key?(:title)

      reward = DiscourseRewards::Rewards.new(current_user).add_reward(params)

      render_serialized(reward, RewardSerializer)
    end

    def index
      page = params[:page].to_i || 1

      rewards = DiscourseRewards::Reward.order(created_at: :desc).offset(page * PAGE_SIZE).limit(PAGE_SIZE)

      reward_list = DiscourseRewards::RewardList.new(rewards: rewards, count: DiscourseRewards::Reward.all.count)

      render_serialized(reward_list, RewardListSerializer)
    end

    def show
      params.require(:id)

      reward = DiscourseRewards::Reward.find(params[:id])

      render_serialized(reward, RewardSerializer)
    end

    def update
      params.require(:id)

      reward = DiscourseRewards::Reward.find(params[:id])

      reward = DiscourseRewards::Rewards.new(current_user, reward).update_reward(params.permit(:points, :quantity, :title, :description, :upload_id, :upload_url, :category, :extra))

      render_serialized(reward, RewardSerializer)
    end

    def destroy
      params.require(:id)

      reward = DiscourseRewards::Reward.find(params[:id]).destroy

      reward = DiscourseRewards::Rewards.new(current_user, reward).destroy_reward

      render_serialized(reward, RewardSerializer)
    end

    def grant
      params.require(:id)

      reward = DiscourseRewards::Reward.find(params[:id])

      error_message = I18n.t("discourse_rewards.redeem.error")

      if current_user.user_points.sum(:reward_points) < reward.points
        opts[:type] = "insufficient_balance"
        return render_json_error(error_message, opts)
      end

      if reward.quantity <= 0
        opts[:type] = "quantity_limit"
        return render_json_error(error_message, opts)
      end

      reward = DiscourseRewards::Rewards.new(current_user, reward).grant_user_reward

      render_serialized(reward, RewardSerializer)
    end

    def user_rewards
      page = params[:page].to_i || 1

      user_rewards = DiscourseRewards::UserReward.where(status: 'applied').offset(page * PAGE_SIZE).limit(PAGE_SIZE)

      user_reward_list = DiscourseRewards::UserRewardList.new(user_rewards: user_rewards, count: DiscourseRewards::UserReward.where(status: 'applied').count)

      render_serialized(user_reward_list, UserRewardListSerializer)
    end

    def grant_user_reward
      params.require(:id)

      user_reward = DiscourseRewards::UserReward.find(params[:id])

      raise Discourse::InvalidParameters.new(:id) if !user_reward

      user_reward = DiscourseRewards::Rewards.new(current_user, user_reward.reward, user_reward).approve_user_reward

      render_serialized(user_reward, UserRewardSerializer)
    end

    def cancel_user_reward
      params.require(:id)
      params.require(:cancel_reason)

      user_reward = DiscourseRewards::UserReward.find(params[:id])

      user_reward = DiscourseRewards::Rewards.new(current_user, user_reward.reward, user_reward).refuse_user_reward(params)

      render_serialized(user_reward, UserRewardSerializer)
    end

    def leaderboard
      page = params[:page].to_i || 1

      query = <<~SQL
        SELECT earned.*, total_spent_points, (total_earned_points - total_spent_points) AS total_available_points FROM (
          SELECT users.*, COALESCE(SUM(discourse_rewards_user_points.reward_points), 0) total_earned_points FROM "users"
          LEFT OUTER JOIN "discourse_rewards_user_points" ON "discourse_rewards_user_points"."user_id" = "users"."id"
          WHERE (users.id NOT IN(select user_id from anonymous_users) AND
            silenced_till IS NULL AND
            suspended_till IS NULL AND
            active=true AND
            users.id > 0)
          GROUP BY "users"."id"
        ) earned INNER JOIN (
          SELECT users.*, COALESCE(SUM(discourse_rewards_user_rewards.points), 0) total_spent_points FROM "users"
          LEFT OUTER JOIN "discourse_rewards_user_rewards" ON "discourse_rewards_user_rewards"."user_id" = "users"."id"
          WHERE (users.id NOT IN(select user_id from anonymous_users)
            AND silenced_till IS NULL
            AND suspended_till IS NULL
            AND active=true
            AND users.id > 0)
          GROUP BY "users"."id"
        ) spent ON earned.id = spent.id
        ORDER BY total_available_points desc, earned.username_lower
      SQL

      users = ActiveRecord::Base.connection.execute(query).to_a

      count = users.length

      current_user_index = users.pluck("id").index(current_user.id)

      users = users.drop(page * PAGE_SIZE).first(PAGE_SIZE)

      users = users.map { |user| User.new(user.with_indifferent_access.except!(:total_earned_points, :total_spent_points, :total_available_points)) } 

      render_json_dump({ count: count, current_user_rank: current_user_index + 1, users: serialize_data(users, BasicUserSerializer) })
    end

    def transactions
      page = params[:page].to_i || 1
      transactions = ActiveRecord::Base.connection.execute("SELECT user_id, null user_reward_id, user_points_category_id,  id point_id, reward_points, created_at FROM discourse_rewards_user_points WHERE user_id=#{current_user.id} UNION SELECT user_id, id, null, null, points, created_at FROM discourse_rewards_user_rewards WHERE user_id=#{current_user.id} ORDER BY created_at DESC").to_a

      count = transactions.length

      transactions = transactions.drop(page * TRANSACTION_PAGE_SIZE).first(TRANSACTION_PAGE_SIZE)

      transactions = transactions.map { |transaction| DiscourseRewards::Transaction.new(transaction.with_indifferent_access) }

      render_json_dump({ count: count, transactions: serialize_data(transactions, TransactionSerializer) })
    end

    def display
    end

    def points_update
      render_json_dump({available_points: current_user.available_points})
    end

    def gift
      params.require(:id)
      params.require(:points)

      id = params[:id]
      points = params[:points].to_i
      error_message = I18n.t("discourse_rewards.gift.error")
      opts = {}

      post = Post.find(id)
      user_received = post.user

      if post.topic.archetype == Archetype.private_message
        opts[:type] = "private_message"
        return render_json_error(error_message, opts)
      end

      if current_user.available_points < points
        opts[:type] = "insufficient_balance"
        return render_json_error(error_message, opts)
      end

      begin
        description_received = {
          type: 'gift_received',
          username: current_user.name,
          post_id: id,
          post_number: post.post_number,
          topic_id: post.topic.id,
          topic_slug: post.topic.slug,
          topic_title: post.topic.title
        }
        description_given = {
          type: 'gift_given',
          username: user_received.name,
          post_id: id,
          post_number: post.post_number,
          topic_id: post.topic.id,
          topic_slug: post.topic.slug,
          topic_title: post.topic.title
        }
        DiscourseRewards::UserPoint.create(user_id: user_received.id, user_points_category_id: 6, reward_points: points, description: description_received.to_json) if points > 0
        DiscourseRewards::UserPoint.create(user_id: current_user.id, user_points_category_id: 7, reward_points: -(points), description: description_given.to_json)

        # user_message_received = {
        #   available_points: user_received.available_points
        # }

        # MessageBus.publish("/u/#{user_received.id}/rewards", user_message_received)

        # user_message_given = {
        #   available_points: current_user.available_points
        # }

        # MessageBus.publish("/u/#{current_user.id}/rewards", user_message_given)

        render_json_dump({ post: serialize_data(post,PostSerializer), points: points, user_received: serialize_data(user_received, BasicUserSerializer), user_given: serialize_data(current_user, BasicUserSerializer)})
      rescue Exception => e
        render_json_error(e.message, opts)
      end
    end

    def lottery

      limiter = RateLimiter.new(current_user, "lottery_limit_per_day", SiteSetting.discourse_rewards_lottery_limit_per_day.to_i, 1.day)
      points_spent = SiteSetting.discourse_rewards_lottery_points_spent_per_time.to_i
      opts = {}
      error_message = I18n.t("discourse_rewards.gacha.lottery.error")
     
      if current_user.available_points < points_spent
        opts[:type] = "insufficient_balance"
        return render_json_error(error_message, opts)

      end
      if limiter.remaining <= 0
        opts[:type] = "rate_limit"
        return render_json_error(error_message, opts)
      end

      begin
        array_key = SiteSetting.discourse_rewards_lottery_prizes.split("|").map(&:to_i)
        array_value = SiteSetting.discourse_rewards_lottery_probability.split("|").map(&:to_f)
        hash = Hash[array_key.zip(array_value)]
        prizes = []
        hash.each do |k, v|
          (v*1000).to_i.times { prizes << k }
        end

        description_out = {
          type: 'lottery_out',
          date: Date.today
        }
        description_in = {
          type: 'lottery_in',
          date: Date.today
        }

        points_earned = prizes.sample.to_i

        DiscourseRewards::UserPoint.create(user_id: current_user.id, user_points_category_id: 8, reward_points: -(points_spent), description: description_out.to_json) if limiter.remaining > 0
        DiscourseRewards::UserPoint.create(user_id: current_user.id, user_points_category_id: 9, reward_points: points_earned, description: description_in.to_json) if limiter.remaining > 0

        # user_message = {
        #   available_points: current_user.available_points
        # }

        # MessageBus.publish("/u/#{current_user.id}/rewards", user_message)
        
        limiter.performed!

        render_json_dump({lottery_prize: points_earned, remaining: limiter.remaining, user: serialize_data(current_user, BasicUserSerializer)})

      rescue Exception => e
        render_json_error(e.message)
      end
    end
  end
end
