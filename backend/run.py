from app import create_app

app = create_app()

if __name__ == '__main__':
    # Deployment Plan Step 4.1: Backend execution
    app.run(debug=True, port=5000)