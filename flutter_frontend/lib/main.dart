import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart'; // Updated import for WebSocketChannel
import 'dart:convert';
import 'package:flutter/foundation.dart'; // Import for kIsWeb

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.blue),
      home: ChatScreen(),
    );
  }
}

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [];
  late WebSocketChannel _channel;

  @override
  void initState() {
    super.initState();
    _connectToWebSocket();
  }

  void _connectToWebSocket() {
    // WebSocket connection URL
    final wsUrl = Uri.parse('ws://localhost:3000');

    // Connect using WebSocketChannel
    _channel = WebSocketChannel.connect(wsUrl);

    // Once connected, send the authorization message
    _channel.stream.listen(
      (message) {
        final data = jsonDecode(message);
        if (data['type'] == 'text') {
          setState(() {
            _messages.add({'role': 'assistant', 'text': data['text']});
          });
        } else if (data['type'] == 'error') {
          setState(() {
            _messages.add({
              'role': 'assistant',
              'text': 'Error: ${data['text']}',
            });
          });
        }
      },
      onError: (error) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'text': 'WebSocket error: $error',
          });
        });
      },
      onDone: () {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'text': 'WebSocket connection closed',
          });
        });
      },
    );

    // Send the API key as an 'auth' message
    final apiKey = 'loser_use_typescript12345'; // Replace with your API key
    _channel.sink.add(jsonEncode({'type': 'auth', 'authorization': apiKey}));
  }

  void _sendMessage() {
    final message = _controller.text.trim();
    if (message.isEmpty) return;

    setState(() {
      _messages.add({'role': 'user', 'text': message});
      _controller.clear();
    });

    // Send text message to the backend via WebSocket
    _channel.sink.add(jsonEncode({'type': 'text', 'text': message}));
  }

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Yuppie AI Chat App'), centerTitle: true),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.all(10),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final isUser = message['role'] == 'user';

                return Align(
                  alignment:
                      isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.symmetric(vertical: 5),
                    padding: EdgeInsets.symmetric(horizontal: 15, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser ? Colors.blue : Colors.grey[300],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      message['text']!,
                      style: TextStyle(
                        color: isUser ? Colors.white : Colors.black,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      contentPadding: EdgeInsets.symmetric(horizontal: 15),
                    ),
                  ),
                ),
                SizedBox(width: 10),
                IconButton(
                  onPressed: _sendMessage,
                  icon: Icon(Icons.send, color: Colors.blue),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
