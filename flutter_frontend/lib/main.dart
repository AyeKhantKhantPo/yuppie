import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(home: ImageUploadScreen());
  }
}

class ImageUploadScreen extends StatefulWidget {
  @override
  _ImageUploadScreenState createState() => _ImageUploadScreenState();
}

class _ImageUploadScreenState extends State<ImageUploadScreen> {
  Uint8List? _imageBytes; // Store image bytes for display
  final WebSocketChannel _channel = WebSocketChannel.connect(
    Uri.parse('ws://localhost:3000'),
  );

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      // Read the image file as bytes
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _imageBytes = bytes; // Store the image bytes for display
      });
    } else {
      print('No image selected.');
    }
  }

  Future<void> _uploadImage() async {
    if (_imageBytes == null) return;

    // Send the image data over WebSocket
    _channel.sink.add(_imageBytes!);

    // Listen for a response from the server
    _channel.stream.listen((message) {
      print('Server response: $message');
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    });
  }

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Upload Image')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            _imageBytes == null
                ? Text('No image selected.')
                : Image.memory(
                  _imageBytes!,
                  height: 200,
                ), // Use Image.memory for web
            SizedBox(height: 20),
            ElevatedButton(onPressed: _pickImage, child: Text('Pick Image')),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _uploadImage,
              child: Text('Upload Image'),
            ),
          ],
        ),
      ),
    );
  }
}
