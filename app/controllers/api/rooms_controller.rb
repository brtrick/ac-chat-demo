class Api::RoomsController < ApplicationController
  before_action :require_logged_in, except: [:index]

  def index
    @rooms = Room.includes(:owner).all
  end

  def show
    @room = Room.includes(messages: [:author, :mentioned_users]).find(params[:id])
    @online_users = RoomsChannel.online_users(@room) << current_user
  end

  def create
    @room = Room.new(room_params)

    if @room.save
      ActionCable.server.broadcast('rooms_index', \
        { type: 'RECEIVE_ROOM', \
          room: from_template('api/rooms/_room', room: @room), \
          user: from_template('api/users/_user', user: @room.owner) })
      render '_room', locals: { room: @room }
    else
      render json: @room.errors.full_messages, status: 422
    end
  end

  def destroy
    @room = Room.find(params[:id])
    @room.destroy
    ActionCable.server.broadcast('rooms_index', { type: 'REMOVE_ROOM', id: @room.id })
    render json: nil, status: :ok
  end

  private

  def room_params
    params.require(:room).permit(:name, :owner_id)
  end
end