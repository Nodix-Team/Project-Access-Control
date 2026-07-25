from jose import jwt
key = '"super-secret-jwt-key"'
token = jwt.encode({'sub': 'admin'}, key, algorithm='HS256')
print('Encoded:', token)
try:
    jwt.decode(token, key, algorithms=['HS256'])
    print('Success!')
except Exception as e:
    print('Failed:', type(e), e)
