import os
import sys
import subprocess

def load_env():
    # Force test settings for verification reliability
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
    with open('.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k] = v

def main():
    load_env()
    # On Windows, execute precisely using the venv binary
    python_exe = os.path.join('venv', 'Scripts', 'python.exe')
    pytest_exe = os.path.join('venv', 'Scripts', 'pytest.exe')
    
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    
    if cmd == 'check':
        res = subprocess.run([python_exe, 'manage.py', 'check'], env=os.environ, capture_output=True, text=True)
        with open('test_output.txt', 'w') as f: f.write(res.stdout + res.stderr)
    elif cmd == 'test_contributions':
        res = subprocess.run([pytest_exe, 'apps/contributions/tests/', '-v'], env=os.environ, capture_output=True, text=True)
        with open('test_output.txt', 'w') as f: f.write(res.stdout + res.stderr)
    elif cmd == 'test_groups':
        res = subprocess.run([pytest_exe, 'apps/groups/tests/test_groups.py', '-v', '--tb=native'], env=os.environ, capture_output=True, text=True)
        with open('test_output.txt', 'w') as f: f.write(res.stdout + res.stderr)
    elif cmd == 'migrate':
        res = subprocess.run([python_exe, 'manage.py', 'migrate'], env=os.environ, capture_output=True, text=True)
        with open('test_output.txt', 'w') as f: f.write(res.stdout + res.stderr)
    elif cmd == 'makemigrations':
        res = subprocess.run([python_exe, 'manage.py', 'makemigrations'], env=os.environ, input='y\ny\n', capture_output=True, text=True)
        with open('test_output.txt', 'w') as f: f.write(res.stdout + res.stderr)
    else:
        print("Unknown command")

if __name__ == '__main__':
    main()
