class CreateDiscourseRewardsTotalPoints < ActiveRecord::Migration[7.0]
  def change
    create_table :discourse_rewards_total_points do |t|
      t.integer :total_earned_points
      t.integer :total_spent_points
      t.integer :available_points
      t.integer :user_id, null: false

      t.timestamps default: -> { 'CURRENT_TIMESTAMP' }
    end
    add_index :discourse_rewards_total_points, :user_id, unique: true
  end
end
