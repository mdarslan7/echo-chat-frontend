import { useState, useEffect, useRef } from "react";
import { Send, PlusCircle, Trash2 } from "lucide-react";
import { openDB } from "idb";

const initDB = async () => {
  return openDB("chatDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
};

const logout = () => {
  localStorage.removeItem("jwt"); 
  window.location.href = "/"; 
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set()); 

  useEffect(() => {
    const loadSessions = async () => {
      const db = await initDB();
      const allSessions = await db.getAll("sessions");

      setSessions(allSessions);

      if (allSessions.length === 0) {
        const newSessionId = await createNewSession();
        setCurrentSession(newSessionId);
      } else {
        const lastSessionId =
          Number(localStorage.getItem("lastSessionId")) || allSessions[0].id;
        setCurrentSession(lastSessionId);
        const session = await db.get("sessions", lastSessionId);
        if (session?.messages) {
          setMessages(session.messages);
          messageIdsRef.current = new Set(
            session.messages.map((msg) => msg.id)
          );
        }
      }
    };

    loadSessions();
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket("wss://echo-websocket-p2h2.onrender.com");

      wsRef.current.onopen = () => {
        console.log("✅ Connected to WebSocket");
        setConnected(true);
      };

      wsRef.current.onmessage = async (event) => {
        let messageText;
        try {
          if (event.data instanceof Blob) {
            messageText = await event.data.text();
          } else {
            messageText = event.data;
          }

          const messageId = `${Date.now()}-${Math.random()}`;

          if (!messageIdsRef.current.has(messageId)) {
            messageIdsRef.current.add(messageId);

            const newMessage = {
              id: messageId,
              text: messageText,
              received: true,
              timestamp: Date.now(),
            };

            setMessages((prev) => {
              const updatedMessages = [...prev, newMessage];
              saveMessagesToDB(updatedMessages).catch(console.error);
              return updatedMessages;
            });
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("❌ Disconnected from WebSocket");
        setConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageId = `${Date.now()}-${Math.random()}`;
        const newMessage = {
          id: messageId,
          text: inputMessage,
          received: false,
          timestamp: Date.now(),
        };

        messageIdsRef.current.add(messageId);
        wsRef.current.send(inputMessage);

        setMessages((prev) => {
          const updatedMessages = [...prev, newMessage];
          saveMessagesToDB(updatedMessages).catch(console.error);
          return updatedMessages;
        });

        setInputMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const saveMessagesToDB = async (updatedMessages) => {
    if (!currentSession) return;
    try {
      const db = await initDB();
      await db.put("sessions", {
        id: currentSession,
        messages: updatedMessages,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  const createNewSession = async () => {
    try {
      const db = await initDB();
      const id = await db.add("sessions", {
        messages: [],
        lastUpdated: new Date().toISOString(),
      });

      setSessions((prev) => [...prev, { id, messages: [] }]);
      setCurrentSession(id);
      localStorage.setItem("lastSessionId", String(id));
      setMessages([]);
      messageIdsRef.current.clear(); 

      return id;
    } catch (error) {
      console.error("Error creating new session:", error);
      return null;
    }
  };

  const switchSession = async (sessionId) => {
    try {
      setCurrentSession(sessionId);
      localStorage.setItem("lastSessionId", String(sessionId));

      const db = await initDB();
      const session = await db.get("sessions", sessionId);
      if (session?.messages) {
        setMessages(session.messages);
        messageIdsRef.current = new Set(session.messages.map((msg) => msg.id));
      } else {
        setMessages([]);
        messageIdsRef.current.clear();
      }
    } catch (error) {
      console.error("Error switching session:", error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const db = await initDB();
      await db.delete("sessions", sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (currentSession === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          const newSession = remainingSessions[0];
          await switchSession(newSession.id);
        } else {
          const newSessionId = await createNewSession();
          if (newSessionId) {
            await switchSession(newSessionId);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="bg-white shadow rounded-t-lg p-4 border-b">
        <h1 className="text-xl font-bold">Chat Now!</h1>
        <div className="flex items-center mt-2">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="flex p-2 bg-gray-200 border-b">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => switchSession(session.id)}
            className={`px-3 py-1 mx-1 rounded-md ${
              currentSession === session.id
                ? "bg-gray-500 text-white"
                : "bg-gray-300"
            }`}
          >
            Session {session.id}
          </button>
        ))}
        <button onClick={createNewSession} className="ml-2 p-1 text-black">
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.received ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-sm rounded-lg px-4 py-2 ${
                message.received
                  ? "bg-white border border-gray-200"
                  : "bg-gray-500 text-white"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">
                {message.text}
              </pre>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="bg-white border-t p-4 rounded-b-lg"
      >
        <div className="flex space-x-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            disabled={!connected}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      {currentSession && (
        <button
          onClick={() => deleteSession(currentSession)}
          className="bg-black mt-2 p-2 text-white rounded flex items-center justify-center gap-2"
        >
          <Trash2 size={20} />
          Delete Current Session
        </button>
      )}

      <button
        onClick={logout}
        className="bg-gray-400 mt-2 p-2 text-white rounded flex items-center justify-center gap-2"
      >
        Logout
      </button>
    </div>
  );
};

export default Chat;