import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';
import { receiveMessage, removeMessage, getMessages, createMessage, destroyMessage } from '../store/messages';
import { fetchRoom } from '../store/rooms';
import { receiveUser } from '../store/users';
import Message from './Message';
import consumer from '../consumer';

function Room() {
  const [body, setBody] = useState('');
  const [usersInRoom, setUsersInRoom] = useState({});
  const activeMessageRef = useRef(null);
  const messageUlRef = useRef(null);
  const { id: roomId } = useParams();
  const messages = useSelector(getMessages(roomId));
  const currentUserId = useSelector(state => state.currentUserId)
  const room = useSelector(state => state.rooms[roomId]);
  const location = useLocation();
  const [activeMessageId, setActiveMessageId] = useState(parseInt(location.hash.slice(1)));
  const usersInRoomArray = Object.values(usersInRoom);
  const dispatch = useDispatch();
  const react = useRef(null);
  const reactionTimeouts = useRef({});

  // Effect to run when entering a room
  useEffect(() => {
    dispatch(fetchRoom(roomId)).then((currentUsersInRoom = {}) => {
      setUsersInRoom(currentUsersInRoom);

      if (activeMessageRef.current) {
        scrollToMessage();
      } else {
        scrollToBottom();
      }
    });

    const subscription = consumer.subscriptions.create(
      { channel: 'RoomsChannel', id: roomId },
      {
        received: ({ type, message, user, id, reaction }) => {
          switch (type) {
            case 'RECEIVE_MESSAGE':
              dispatch(receiveMessage(message));
              dispatch(receiveUser(user));
              break;
            case 'DESTROY_MESSAGE':
              dispatch(removeMessage(id));
              break;
            case 'RECEIVE_USER':
              setUsersInRoom(prevUsersInRoom => ({ ...prevUsersInRoom, [user.id]: user }));
              break;
            case 'REMOVE_USER':
              setUsersInRoom(prevUsersInRoom => {
                const { [id]: _removed, ...remainingUsers } = prevUsersInRoom;
                return remainingUsers;
              });
              break;
            case 'RECEIVE_REACTION':
              window.clearTimeout(reactionTimeouts.current[id]);
              setReaction(id, reaction);
              reactionTimeouts.current[id] = window.setTimeout(() => {
                setReaction(id, null);
              }, 4000);
              break;
            default:
              console.log('Unhandled broadcast: ', type);
              break;
          }
        }
      }
    );

    react.current = reaction => subscription?.perform('react', { reaction });
    return () => subscription?.unsubscribe();
  }, [roomId, dispatch]);

  useEffect (() => {
    setActiveMessageId(parseInt(window.location.hash.slice(1)));
  }, [window.location.hash]);

  useEffect(() => {
    if (activeMessageRef.current) {
        scrollToMessage();
      } else {
        scrollToBottom();
      }
  }, [activeMessageId]);
  
  const scrollToMessage = () => {
    activeMessageRef.current.focus();
    activeMessageRef.current.scrollIntoView();
  };

  const scrollToBottom = () => {
    messageUlRef.current.scrollTop = messageUlRef.current.scrollHeight;
  };

  const setReaction = (id, reaction) => {
    setUsersInRoom(prevUsersInRoom => ({ ...prevUsersInRoom, [id]: { ...prevUsersInRoom[id], reaction } }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    createMessage({ body, roomId, authorId: currentUserId }).then(() => {
      setBody('');
    });
  };

  const handleDelete = messageId => {
    destroyMessage(messageId);
  };

  const generateReactions = (...reactions) => {
    return reactions.map(reaction => (
      <span
        key={reaction}
        className='reaction'
        onClick={() => react.current(reaction)}
      >
        {reaction}
      </ span>
    ));
  };

  return (
    <>
      <section className='room home-section'>
        <h1>{room?.name}</h1>

        <ul ref={messageUlRef}>
          {messages.map(message => (
            <li
              key={message.id}
              ref={activeMessageId === message.id ? activeMessageRef : null}
              tabIndex={-1}
            >
              <Message {...message} />
              {message.authorId === currentUserId && (
                <button
                  className='btn-delete'
                  onClick={() => handleDelete(message.id)}
                >
                  x
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={handleSubmit}>
          <textarea
            rows={body.split('\n').length}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if (e.code === 'Enter' && !e.shiftKey) {
                handleSubmit(e);
              }
            }}
            value={body}
          />
          <div className='message-controls'>
            <div>
              {generateReactions('👍', '❤️', '🔥', '😡')}
            </div>
            <button className='btn-primary' disabled={!body}>
              Send Message
            </button>
          </div>
        </form>
      </section>
      <section className='online-users home-section'>
        <h2>In Room</h2>
        <ul >
          {usersInRoomArray.map(({ id, username, reaction }) => (
            <li key={id} className={currentUserId === id ? 'current' : ''}>
              <span className='reaction'>{reaction}</span>
              <span>{username}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default Room;