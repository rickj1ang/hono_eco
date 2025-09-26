#!/usr/bin/env python3
"""
Cloudflare Workers IP Monitor Test Script
测试Cloudflare Workers的IP切换机制
"""

import requests
import time
import json
from datetime import datetime

API_BASE_URL = "https://1cocrawler.rick0j1ang.workers.dev"

def test_ip_monitor():
    """测试IP监控端点"""
    print("🔍 开始测试Cloudflare Workers IP切换机制")
    print(f"📡 API端点: {API_BASE_URL}/hk-post/ip-monitor")
    print("=" * 60)
    
    for i in range(20):  # 测试20次请求
        try:
            response = requests.get(f"{API_BASE_URL}/hk-post/ip-monitor", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                ip_info = data.get('ip_info', {})
                
                print(f"请求 #{i+1:2d}: {data.get('timestamp', 'N/A')}")
                print(f"  CF-Ray: {ip_info.get('cf_ray', 'N/A')}")
                print(f"  CF-Connecting-IP: {ip_info.get('cf_connecting_ip', 'N/A')}")
                print(f"  CF-IPCountry: {ip_info.get('cf_ipcountry', 'N/A')}")
                print(f"  X-Forwarded-For: {ip_info.get('x_forwarded_for', 'N/A')}")
                print(f"  User-Agent: {ip_info.get('user_agent', 'N/A')[:50]}...")
                print("-" * 40)
            else:
                print(f"请求 #{i+1:2d}: 失败 - HTTP {response.status_code}")
                
        except Exception as e:
            print(f"请求 #{i+1:2d}: 错误 - {e}")
        
        # 等待1秒再发送下一个请求
        time.sleep(1)
    
    print("✅ IP监控测试完成！")
    print("📊 请检查你的日志服务查看详细的IP变化记录")

def test_building_search_with_ip_log():
    """测试建筑搜索端点（带IP记录）"""
    print("\n🏢 开始测试建筑搜索端点（带IP记录）")
    print(f"📡 API端点: {API_BASE_URL}/hk-post/search-buildings")
    print("=" * 60)
    
    test_queries = ["beneville", "central", "ifc", "landmark", "times square"]
    
    for i, query in enumerate(test_queries):
        try:
            response = requests.get(
                f"{API_BASE_URL}/hk-post/search-buildings",
                params={'query': query, 'lang': 'en_US'},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"搜索 #{i+1}: '{query}' - 找到 {data.get('count', 0)} 个建筑")
                print(f"  Session ID: {data.get('session_id', 'N/A')}")
                print(f"  时间戳: {data.get('timestamp', 'N/A')}")
            else:
                print(f"搜索 #{i+1}: '{query}' - 失败 HTTP {response.status_code}")
                
        except Exception as e:
            print(f"搜索 #{i+1}: '{query}' - 错误 {e}")
        
        # 等待2秒再发送下一个请求
        time.sleep(2)
    
    print("✅ 建筑搜索测试完成！")

if __name__ == "__main__":
    print("🚀 Cloudflare Workers IP监控测试")
    print("=" * 60)
    
    # 测试IP监控端点
    test_ip_monitor()
    
    # 测试建筑搜索端点
    test_building_search_with_ip_log()
    
    print("\n📋 测试总结:")
    print("1. IP监控端点会记录每次请求的IP信息到你的日志服务")
    print("2. 建筑搜索端点也会在每次搜索时记录IP信息")
    print("3. 请检查 http://ai-service.victorysec.com.hk/api/get-all-events 的日志")
    print("4. 观察Cloudflare Workers的IP切换模式和频率")
