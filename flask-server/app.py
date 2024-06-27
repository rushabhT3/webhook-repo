from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mongoengine import MongoEngine
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure MongoDB connection
app.config['MONGODB_SETTINGS'] = {
    'db': 'node',
    'host': os.getenv("MONGO_URI")
}

db = MongoEngine()
db.init_app(app)

class Event(db.Document):
    action = db.StringField(required=True)
    request_id = db.StringField()
    author = db.StringField(required=True)
    fromBranch = db.StringField()
    toBranch = db.StringField()
    timestamp = db.DateTimeField(default=datetime.utcnow)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    action = data.get('action')
    sender = data.get('sender')
    repository = data.get('repository')
    pull_request = data.get('pull_request')
    head_commit = data.get('head_commit')

    event_type = request.headers.get('X-GitHub-Event')
    from_branch, to_branch, request_id = None, None, None

    if event_type == 'push':
        action = 'PUSH'
        to_branch = data.get('ref').split('/')[-1]
        request_id = head_commit.get('id') if head_commit else None
    elif event_type == 'pull_request':
        action = 'PULL'
        from_branch = pull_request.get('head', {}).get('ref')
        to_branch = pull_request.get('base', {}).get('ref')
        request_id = pull_request.get('id')
    elif event_type == 'pull_request_review' and action == 'closed' and pull_request.get('merged'):
        action = 'MERGE'
        from_branch = pull_request.get('head', {}).get('ref')
        to_branch = pull_request.get('base', {}).get('ref')

    if action:
        event = Event(
            action=action,
            author=sender.get('login'),
            fromBranch=from_branch,
            toBranch=to_branch,
            timestamp=datetime.utcnow(),
            request_id=request_id
        )
        event.save()
        return '', 200
    return '', 400

@app.route('/events', methods=['GET'])
def get_events():
    events = Event.objects()
    return jsonify(events), 200

if __name__ == '__main__':
    app.run(port=4000)
