import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:typed_data';
import 'config.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: true,
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
  final List<Map<String, dynamic>> _messages = [];
  late WebSocketChannel _channel;
  XFile? _imageFile;
  Uint8List? _imageBytes;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _connectToWebSocket();
  }

  void _connectToWebSocket() {
    final wsUrl = Uri.parse(Config.wsUrl);
    _channel = WebSocketChannel.connect(wsUrl);

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

    // final apiKey = 'loser_use_typescript12345';
    _channel.sink.add(
      jsonEncode({'type': 'auth', 'authorization': Config.apiKey}),
    );
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() {
          _imageFile = image;
          _imageBytes = bytes;
        });
      }
    } catch (e) {
      print('Error picking image: $e');
    }
  }

  void _removeImage() {
    setState(() {
      _imageFile = null;
      _imageBytes = null;
    });
  }

  void _sendMessage() async {
    final message = _controller.text.trim();
    if (message.isEmpty && _imageBytes == null) return;

    setState(() {
      if (message.isNotEmpty) {
        _messages.add({'role': 'user', 'text': message});
      }
      if (_imageBytes != null) {
        _messages.add({
          'role': 'user',
          'image': _imageBytes,
          'text': message.isNotEmpty ? message : 'Analyze this image',
        });
      }
      _controller.clear();
    });

    if (_imageBytes != null) {
      final base64Image = base64Encode(_imageBytes!);
      _channel.sink.add(
        jsonEncode({
          'type': 'image',
          'text': message.isNotEmpty ? message : 'Analyze this image',
          'image': base64Image,
        }),
      );
      _removeImage();
    } else {
      _channel.sink.add(jsonEncode({'type': 'text', 'text': message}));
    }
  }

  Widget _buildImageWidget(dynamic imageData) {
    if (imageData == null) return SizedBox();

    if (kIsWeb) {
      return Image.memory(
        imageData as Uint8List,
        height: 200,
        width: 200,
        fit: BoxFit.cover,
      );
    } else {
      return Image.file(
        File(imageData as String),
        height: 200,
        width: 200,
        fit: BoxFit.cover,
      );
    }
  }

  Widget _buildImagePreview() {
    if (_imageBytes == null) return SizedBox();

    return Stack(
      alignment: Alignment.topRight,
      children: [
        Container(
          height: 100,
          width: 100,
          margin: EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
          child:
              kIsWeb
                  ? Image.memory(_imageBytes!, fit: BoxFit.cover)
                  : Image.file(File(_imageFile!.path), fit: BoxFit.cover),
        ),
        IconButton(
          icon: Icon(Icons.close, color: Colors.red),
          onPressed: _removeImage,
        ),
      ],
    );
  }

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Yuppie AI'), centerTitle: true),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.all(10),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final isUser = message['role'] == 'user';

                return Column(
                  crossAxisAlignment:
                      isUser
                          ? CrossAxisAlignment.end
                          : CrossAxisAlignment.start,
                  children: [
                    if (message['image'] != null)
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 5),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: _buildImageWidget(message['image']),
                        ),
                      ),
                    Container(
                      margin: EdgeInsets.symmetric(vertical: 5),
                      padding: EdgeInsets.symmetric(
                        horizontal: 15,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isUser ? Colors.blue : Colors.grey[300],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: MarkdownBody(
                        // <-- This is the changed part
                        data: message['text'] ?? '',
                        styleSheet: MarkdownStyleSheet(
                          p: TextStyle(
                            color: isUser ? Colors.white : Colors.black,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          _buildImagePreview(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.attach_file, color: Colors.blue),
                  onPressed: _pickImage,
                ),
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
                    onSubmitted: (_) => _sendMessage(),
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
