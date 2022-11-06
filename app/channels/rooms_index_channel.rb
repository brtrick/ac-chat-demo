class RoomsIndexChannel < ApplicationCable::Channel
  def subscribed
    stream_from "rooms_index"
  end
end
