# -*-coding = utf-8-*-
# created by Yiyang on 2023/5/30 17:03
import requests
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
}
response = requests.get("https://movie.douban.com/top250",headers = headers)
print(response.text)