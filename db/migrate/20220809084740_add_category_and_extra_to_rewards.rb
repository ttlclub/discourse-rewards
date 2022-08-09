class AddCategoryAndExtraToRewards < ActiveRecord::Migration[7.0]
  def change
    add_column :discourse_rewards_rewards, :category, :integer
    add_column :discourse_rewards_rewards, :extra, :string
  end
end
